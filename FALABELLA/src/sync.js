import { config } from './config.js';
import { logger } from './logger.js';
import { buildCreatePayload, buildUpdatePayload, loadCatalogRules } from './lib/catalog.js';
import { FalabellaClient } from './lib/falabella.js';
import { fetchShopifyVariants, resolveShopifyLocationId, setShopifyInventoryLevels } from './lib/shopify.js';
import { closeStockSource, loadStockBySku } from './lib/stock-source.js';
import { upsertSkuMap } from './storage/sku-map.js';
import { applyMarkup, isoTimestamp } from './utils.js';

function isSabanaVariant(variant) {
  const haystack = [
    variant.productTitle || '',
    variant.productType || '',
    ...(variant.tags || [])
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes('sabana') || haystack.includes('sabanas') || haystack.includes('sheet');
}

export async function runSync() {
  const startedAt = Date.now();
  const falabellaClient = new FalabellaClient();
  const skuMapUpdates = {};

  try {
    logger.info('Sync started');

    const [locationId, stockBySku, catalog] = await Promise.all([
      resolveShopifyLocationId(),
      loadStockBySku(),
      loadCatalogRules()
    ]);

    const allVariants = await fetchShopifyVariants();
    const scopedVariants = config.app.syncOnlySabanas
      ? allVariants.filter(isSabanaVariant)
      : allVariants;
    const variants = config.app.maxProductsPerRun > 0
      ? scopedVariants.slice(0, config.app.maxProductsPerRun)
      : scopedVariants;

    if (config.app.syncOnlySabanas) {
      logger.info('Scope filter enabled: only sabanas', {
        totalVariants: allVariants.length,
        scopedVariants: scopedVariants.length
      });
    }

    const inventoryUpdates = variants
      .map((variant) => ({
        ...variant,
        quantity: stockBySku.has(variant.sku)
          ? stockBySku.get(variant.sku)
          : config.stock.defaultWhenMissing
      }))
      .filter((variant) => variant.currentInventoryQuantity !== variant.quantity);

    await setShopifyInventoryLevels(inventoryUpdates, locationId);

    const falabellaProducts = await falabellaClient.getAllProducts();
    const falabellaBySku = new Map(falabellaProducts.map((product) => [product.sellerSku, product]));

    const createPayloads = [];
    const updatePayloads = [];
    const summary = {
      variantsConsidered: variants.length,
      shopifyInventoryUpdated: inventoryUpdates.length,
      toCreate: 0,
      toUpdate: 0,
      skipped: 0,
      createFeeds: [],
      updateFeeds: [],
      imageFeeds: []
    };

    for (const variant of variants) {
      const stock = stockBySku.has(variant.sku)
        ? stockBySku.get(variant.sku)
        : config.stock.defaultWhenMissing;
      const price = applyMarkup(variant.price, config.app.priceMarkupPercent, config.app.minPrice);

      if (falabellaBySku.has(variant.sku)) {
        updatePayloads.push({
          payload: buildUpdatePayload(variant, stock, price),
          variant,
          stock,
          price
        });
        summary.toUpdate += 1;
        skuMapUpdates[variant.sku] = {
          status: 'update_pending',
          lastSeenAt: isoTimestamp(),
          desiredStock: stock,
          desiredPrice: price,
          categoryId: skuMapUpdates[variant.sku]?.categoryId || ''
        };
        continue;
      }

      const createPlan = await buildCreatePayload(variant, stock, price, falabellaClient, catalog);
      if (!createPlan.ready) {
        summary.skipped += 1;
        skuMapUpdates[variant.sku] = {
          status: `skipped_${createPlan.reason}`,
          lastSeenAt: isoTimestamp(),
          desiredStock: stock,
          desiredPrice: price,
          categoryId: createPlan.categoryId,
          missingMandatoryAttributes: createPlan.missingMandatoryAttributes
        };
        logger.warn('Skipping Falabella create', {
          sku: variant.sku,
          reason: createPlan.reason,
          missingMandatoryAttributes: createPlan.missingMandatoryAttributes
        });
        continue;
      }

      createPayloads.push({
        payload: createPlan.payload,
        variant,
        stock,
        price,
        categoryId: createPlan.categoryId
      });
      summary.toCreate += 1;
      skuMapUpdates[variant.sku] = {
        status: 'create_pending',
        lastSeenAt: isoTimestamp(),
        desiredStock: stock,
        desiredPrice: price,
        categoryId: createPlan.categoryId
      };
    }

    if (updatePayloads.length > 0) {
      const results = await falabellaClient.updateProductsInBatches(updatePayloads.map((entry) => entry.payload));
      for (const result of results) {
        summary.updateFeeds.push(result.feed);
        for (const payload of result.batch) {
          const success = result.feed.status === 'Finished' && Number(result.feed.failedRecords || 0) === 0;
          skuMapUpdates[payload.SellerSku] = {
            ...(skuMapUpdates[payload.SellerSku] || {}),
            status: success ? 'updated' : `update_${result.feed.status.toLowerCase()}`,
            lastFeedId: result.feed.feedId,
            lastSyncedAt: isoTimestamp(),
            ...(success ? { missingMandatoryAttributes: [] } : {})
          };
        }
      }
    }

    if (createPayloads.length > 0) {
      const createResults = await falabellaClient.createProductsInBatches(createPayloads.map((entry) => entry.payload));
      for (const result of createResults) {
        summary.createFeeds.push(result.feed);
        for (const payload of result.batch) {
          const success = result.feed.status === 'Finished' && Number(result.feed.failedRecords || 0) === 0;
          skuMapUpdates[payload.SellerSku] = {
            ...(skuMapUpdates[payload.SellerSku] || {}),
            status: success ? 'created' : `create_${result.feed.status.toLowerCase()}`,
            lastFeedId: result.feed.feedId,
            lastSyncedAt: isoTimestamp(),
            ...(success ? { missingMandatoryAttributes: [] } : {})
          };
        }

        if (!config.falabella.skipImageUpload && result.feed.status === 'Finished' && Number(result.feed.failedRecords || 0) === 0) {
          const imagesPayload = result.batch
            .filter((payload) => payload.imageUrls?.length > 0)
            .map((payload) => ({
              SellerSku: payload.SellerSku,
              Images: payload.imageUrls
            }));

          if (imagesPayload.length > 0) {
            const imageResult = await falabellaClient.uploadImages(imagesPayload);
            const imageFeed = await falabellaClient.pollFeed(imageResult.requestId);
            summary.imageFeeds.push(imageFeed);

            for (const imageEntry of imagesPayload) {
              skuMapUpdates[imageEntry.SellerSku] = {
                ...(skuMapUpdates[imageEntry.SellerSku] || {}),
                lastImageFeedId: imageFeed.feedId,
                imageStatus: imageFeed.status
              };
            }
          }
        }
      }
    }

    await upsertSkuMap(skuMapUpdates);

    const durationMs = Date.now() - startedAt;
    logger.info('Sync finished', {
      durationMs,
      summary
    });

    return summary;
  } finally {
    await closeStockSource();
  }
}