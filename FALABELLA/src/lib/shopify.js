import axios from 'axios';

import { config } from '../config.js';
import { logger } from '../logger.js';
import { ensureArray, normalizeSku, sleep, toInt } from '../utils.js';

const graphQlClient = axios.create({
  baseURL: `https://${config.shopify.store}/admin/api/${config.shopify.apiVersion}`,
  headers: {
    'X-Shopify-Access-Token': config.shopify.accessToken,
    'Content-Type': 'application/json'
  },
  timeout: 60000
});

const restClient = axios.create({
  baseURL: `https://${config.shopify.store}/admin/api/${config.shopify.apiVersion}`,
  headers: {
    'X-Shopify-Access-Token': config.shopify.accessToken,
    'Content-Type': 'application/json'
  },
  timeout: 60000
});

function isValidFalabellaImage(image) {
  if (!image?.url) {
    return false;
  }

  const width = Number(image.width || 0);
  const height = Number(image.height || 0);

  if (!width || !height) {
    return true;
  }

  return width >= 400 && width <= 2000 && height >= 400 && height <= 2000;
}

async function graphQl(query, variables = {}) {
  const { data } = await graphQlClient.post('/graphql.json', { query, variables });
  if (data.errors?.length) {
    throw new Error(`Shopify GraphQL error: ${JSON.stringify(data.errors)}`);
  }

  return data.data;
}

async function setInventoryLevel(update, locationId) {
  const maxAttempts = 6;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await restClient.post('/inventory_levels/set.json', {
        location_id: Number(locationId),
        inventory_item_id: Number(update.inventoryItemId),
        available: update.quantity,
        disconnect_if_necessary: true
      });
      return;
    } catch (error) {
      const status = error.response?.status;
      const retryAfterHeader = Number(error.response?.headers?.['retry-after'] || 0);
      const shouldRetry = status === 429 || status >= 500;

      if (!shouldRetry || attempt === maxAttempts) {
        throw error;
      }

      const delayMs = retryAfterHeader > 0 ? retryAfterHeader * 1000 : attempt * 1000;
      logger.warn('Retrying Shopify inventory update', {
        sku: update.sku,
        status,
        attempt,
        delayMs
      });
      await sleep(delayMs);
    }
  }
}

export async function resolveShopifyLocationId() {
  if (config.shopify.locationId) {
    return String(config.shopify.locationId);
  }

  const query = `
    query ResolveLocation {
      locations(first: 20) {
        edges {
          node {
            id
            legacyResourceId
            name
            isActive
          }
        }
      }
    }
  `;

  const data = await graphQl(query);
  const activeLocation = data.locations.edges
    .map((edge) => edge.node)
    .find((location) => location.isActive);

  if (!activeLocation) {
    throw new Error('No active Shopify location found');
  }

  logger.info('Using first active Shopify location', {
    locationId: activeLocation.legacyResourceId,
    locationName: activeLocation.name
  });

  return String(activeLocation.legacyResourceId);
}

export async function fetchShopifyVariants() {
  const products = [];
  let cursor = null;
  let hasNextPage = true;

  const query = `
    query FetchProducts($cursor: String) {
      products(first: 50, after: $cursor, query: "status:active") {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            handle
            title
            descriptionHtml
            vendor
            productType
            tags
            featuredImage {
              url
              width
              height
            }
            images(first: 8) {
              edges {
                node {
                  url
                  width
                  height
                }
              }
            }
            variants(first: 100) {
              edges {
                node {
                  id
                  title
                  sku
                  price
                  barcode
                  inventoryPolicy
                  inventoryQuantity
                  selectedOptions {
                    name
                    value
                  }
                  inventoryItem {
                    id
                    legacyResourceId
                    tracked
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  while (hasNextPage) {
    const data = await graphQl(query, { cursor });
    const connection = data.products;

    for (const edge of connection.edges) {
      products.push(edge.node);
    }

    cursor = connection.pageInfo.endCursor;
    hasNextPage = connection.pageInfo.hasNextPage;
  }

  const variants = [];
  let skippedImages = 0;

  for (const product of products) {
    const allImages = product.images.edges.map((edge) => edge.node);
    const validImages = allImages.filter((image) => {
      const isValid = isValidFalabellaImage(image);
      if (!isValid) {
        skippedImages += 1;
      }
      return isValid;
    });
    const images = validImages.map((image) => image.url);
    const featuredImage = isValidFalabellaImage(product.featuredImage)
      ? product.featuredImage?.url || ''
      : images[0] || '';

    for (const variantEdge of product.variants.edges) {
      const variant = variantEdge.node;
      const sku = normalizeSku(variant.sku);
      if (!sku) {
        continue;
      }

      variants.push({
        shopifyProductId: product.id,
        shopifyVariantId: variant.id,
        inventoryItemId: String(variant.inventoryItem.legacyResourceId),
        sku,
        price: variant.price,
        barcode: variant.barcode || '',
        productTitle: product.title,
        variantTitle: variant.title,
        vendor: product.vendor || '',
        productType: product.productType || '',
        tags: ensureArray(product.tags),
        handle: product.handle,
        descriptionHtml: product.descriptionHtml || '',
        featuredImageUrl: featuredImage,
        imageUrls: images,
        inventoryTracked: Boolean(variant.inventoryItem.tracked),
        currentInventoryQuantity: toInt(variant.inventoryQuantity, 0),
        selectedOptions: variant.selectedOptions || []
      });
    }
  }

  logger.info('Loaded Shopify variants', {
    variants: variants.length,
    products: products.length,
    skippedImages
  });
  return variants;
}

export async function setShopifyInventoryLevels(updates, locationId) {
  const eligibleUpdates = updates.filter((update) => update.inventoryTracked);
  let updated = 0;

  for (const update of eligibleUpdates) {
    await setInventoryLevel(update, locationId);
    updated += 1;

    if (updated < eligibleUpdates.length) {
      logger.info('Shopify inventory update progress', {
        updated,
        total: eligibleUpdates.length
      });
    }
  }

  logger.info('Updated Shopify inventory levels', { updated, locationId });
}