import crypto from 'node:crypto';

import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { create } from 'xmlbuilder2';

import { config } from '../config.js';
import { logger } from '../logger.js';
import { asArray, chunk, sleep, toInt, toNumber } from '../utils.js';

function encodeRfc3986(value) {
  return encodeURIComponent(String(value))
    .replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

function serializeParams(parameters) {
  const pairs = [];

  for (const [name, value] of Object.entries(parameters)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        pairs.push(`${encodeRfc3986(name)}=${encodeRfc3986(entry)}`);
      }
      continue;
    }

    pairs.push(`${encodeRfc3986(name)}=${encodeRfc3986(value)}`);
  }

  return pairs.join('&');
}

function deepValue(input, key) {
  if (input === null || input === undefined) {
    return undefined;
  }

  if (Array.isArray(input)) {
    for (const entry of input) {
      const found = deepValue(entry, key);
      if (found !== undefined) {
        return found;
      }
    }
    return undefined;
  }

  if (typeof input !== 'object') {
    return undefined;
  }

  if (Object.prototype.hasOwnProperty.call(input, key)) {
    return input[key];
  }

  for (const value of Object.values(input)) {
    const found = deepValue(value, key);
    if (found !== undefined) {
      return found;
    }
  }

  return undefined;
}

function deepCollect(input, key, results = []) {
  if (input === null || input === undefined) {
    return results;
  }

  if (Array.isArray(input)) {
    for (const entry of input) {
      deepCollect(entry, key, results);
    }
    return results;
  }

  if (typeof input !== 'object') {
    return results;
  }

  if (Object.prototype.hasOwnProperty.call(input, key)) {
    results.push(input[key]);
  }

  for (const value of Object.values(input)) {
    deepCollect(value, key, results);
  }

  return results;
}

function getHead(parsed) {
  return parsed?.SuccessResponse?.Head || parsed?.Head || {};
}

function getBody(parsed) {
  return parsed?.SuccessResponse?.Body || parsed?.Body || {};
}

function normalizeProduct(product) {
  const businessUnits = asArray(product.BusinessUnits?.BusinessUnit || product.BusinessUnit);
  const businessUnit = businessUnits[0] || {};

  return {
    sellerSku: String(product.SellerSku || '').trim(),
    name: product.Name || '',
    status: businessUnit.Status || '',
    price: toNumber(businessUnit.Price, 0),
    stock: toInt(businessUnit.Stock, 0),
    qcStatus: product.QCStatus || '',
    isPublished: String(product.isPublished || '') === '1'
  };
}

export class FalabellaClient {
  constructor() {
    this.http = axios.create({
      baseURL: config.falabella.baseUrl,
      timeout: 60000,
      validateStatus: () => true
    });
    this.parser = new XMLParser({
      ignoreAttributes: false,
      parseTagValue: true,
      trimValues: true
    });
    this.categoryAttributesCache = new Map();
  }

  buildSignedParams(action, extraParams = {}) {
    const parameters = {
      Action: action,
      Format: config.falabella.format,
      Timestamp: new Date().toISOString(),
      UserID: config.falabella.userId,
      Version: config.falabella.version,
      ...extraParams
    };

    const sortedEntries = Object.entries(parameters).sort(([left], [right]) => left.localeCompare(right));
    const sortedParameters = Object.fromEntries(sortedEntries);
    const baseString = serializeParams(sortedParameters);
    const signature = crypto
      .createHmac('sha256', config.falabella.apiKey)
      .update(baseString)
      .digest('hex');

    return {
      ...sortedParameters,
      Signature: signature
    };
  }

  async request({ action, method = 'GET', params = {}, body = '' }) {
    const signedParams = this.buildSignedParams(action, params);
    const queryString = serializeParams(signedParams);
    const url = `/?${queryString}`;

    const response = await this.http.request({
      url,
      method,
      data: body || undefined,
      headers: {
        Accept: 'application/xml',
        'Content-Type': 'application/xml'
      }
    });

    const parsed = this.parseResponse(response.data, action);
    return parsed;
  }

  parseResponse(raw, action) {
    const parsed = typeof raw === 'string' ? this.parser.parse(raw) : raw;
    if (parsed?.ErrorResponse) {
      const errorMessage = parsed.ErrorResponse.Head?.ErrorMessage || `Falabella ${action} failed`;
      const error = new Error(errorMessage);
      error.details = parsed.ErrorResponse;
      throw error;
    }

    return parsed;
  }

  async getAllProducts() {
    const products = [];
    let offset = 0;
    const limit = 1000;

    while (true) {
      const response = await this.request({
        action: 'GetProducts',
        method: 'GET',
        params: {
          Filter: 'all',
          Limit: limit,
          Offset: offset
        }
      });

      const body = getBody(response);
      const batch = asArray(body?.Products?.Product).map(normalizeProduct).filter((product) => product.sellerSku);
      products.push(...batch);

      if (batch.length < limit) {
        break;
      }

      offset += limit;
    }

    logger.info('Loaded products from Falabella', { products: products.length });
    return products;
  }

  async getCategorySuggestion(title) {
    const response = await this.request({
      action: 'GetCategorySuggestion',
      method: 'GET',
      params: {
        Name: title
      }
    });

    return {
      categoryId: String(deepValue(getBody(response), 'CategoryId') || ''),
      categoryName: String(deepValue(getBody(response), 'CategoryName') || '')
    };
  }

  async getCategoryAttributes(categoryId) {
    if (this.categoryAttributesCache.has(categoryId)) {
      return this.categoryAttributesCache.get(categoryId);
    }

    const response = await this.request({
      action: 'GetCategoryAttributes',
      method: 'GET',
      params: {
        PrimaryCategory: categoryId
      }
    });

    const body = getBody(response);
    const rawAttributes = deepCollect(body, 'Attribute').flatMap((entry) => asArray(entry));
    const attributes = rawAttributes.map((attribute) => ({
      name: String(attribute.Name || '').trim(),
      feedName: String(attribute.FeedName || '').trim(),
      label: String(attribute.Label || '').trim(),
      mandatory: String(attribute.isMandatory || attribute.IsMandatory || '0') === '1',
      attributeType: String(attribute.AttributeType || '').trim(),
      groupName: String(attribute.GroupName || '').trim()
    }));

    this.categoryAttributesCache.set(categoryId, attributes);
    return attributes;
  }

  buildProductCreateXml(products) {
    const object = {
      Request: {
        Product: products.map((product) => ({
          SellerSku: product.SellerSku,
          ...(product.ParentSku ? { ParentSku: product.ParentSku } : {}),
          Name: product.Name,
          PrimaryCategory: product.PrimaryCategory,
          Description: product.Description,
          Brand: product.Brand,
          ...(product.ProductId ? { ProductId: product.ProductId } : {}),
          ...product.ProductAttributes,
          BusinessUnits: {
            BusinessUnit: [product.BusinessUnit]
          },
          ProductData: product.ProductData
        }))
      }
    };

    return create({ version: '1.0', encoding: 'UTF-8' }).ele(object).end({ prettyPrint: true });
  }

  buildProductUpdateXml(products) {
    const object = {
      Request: {
        Product: products.map((product) => ({
          SellerSku: product.SellerSku,
          ...(product.Name ? { Name: product.Name } : {}),
          ...(product.Description ? { Description: product.Description } : {}),
          ...(product.Brand ? { Brand: product.Brand } : {}),
          ...(product.ProductId ? { ProductId: product.ProductId } : {}),
          ...(product.ProductAttributes && Object.keys(product.ProductAttributes).length > 0
            ? product.ProductAttributes
            : {}),
          BusinessUnits: {
            BusinessUnit: [product.BusinessUnit]
          },
          ProductData: product.ProductData || {}
        }))
      }
    };

    return create({ version: '1.0', encoding: 'UTF-8' }).ele(object).end({ prettyPrint: true });
  }

  buildImageXml(images) {
    const object = {
      Request: {
        ProductImage: images.map((image) => ({
          SellerSku: image.SellerSku,
          Images: {
            Image: image.Images
          }
        }))
      }
    };

    return create({ version: '1.0', encoding: 'UTF-8' }).ele(object).end({ prettyPrint: true });
  }

  async createProducts(products) {
    const body = this.buildProductCreateXml(products);
    const response = await this.request({
      action: 'ProductCreate',
      method: 'POST',
      body
    });

    return {
      requestId: String(getHead(response).RequestId || deepValue(response, 'RequestId') || '')
    };
  }

  async updateProducts(products) {
    const body = this.buildProductUpdateXml(products);
    const response = await this.request({
      action: 'ProductUpdate',
      method: 'POST',
      body
    });

    return {
      requestId: String(getHead(response).RequestId || deepValue(response, 'RequestId') || '')
    };
  }

  async uploadImages(images) {
    const body = this.buildImageXml(images);
    const response = await this.request({
      action: 'Image',
      method: 'POST',
      body
    });

    return {
      requestId: String(getHead(response).RequestId || deepValue(response, 'RequestId') || '')
    };
  }

  async pollFeed(feedId) {
    if (!feedId) {
      return {
        feedId: '',
        status: 'unknown',
        failedRecords: 0,
        processedRecords: 0,
        totalRecords: 0
      };
    }

    for (let attempt = 1; attempt <= config.falabella.feedPollAttempts; attempt += 1) {
      const response = await this.request({
        action: 'FeedStatus',
        method: 'GET',
        params: {
          FeedID: feedId
        }
      });

      const status = String(deepValue(getBody(response), 'Status') || '').trim();
      const details = {
        feedId: String(deepValue(getBody(response), 'Feed') || feedId),
        status: status || 'unknown',
        totalRecords: toInt(deepValue(getBody(response), 'TotalRecords'), 0),
        processedRecords: toInt(deepValue(getBody(response), 'ProcessedRecords'), 0),
        failedRecords: toInt(deepValue(getBody(response), 'FailedRecords'), 0)
      };

      if (['Finished', 'Error', 'Canceled'].includes(details.status)) {
        return details;
      }

      await sleep(config.falabella.feedPollIntervalMs);
    }

    return {
      feedId,
      status: 'timeout',
      totalRecords: 0,
      processedRecords: 0,
      failedRecords: 0
    };
  }

  async createProductsInBatches(products, batchSize = 100) {
    const responses = [];

    for (const batch of chunk(products, batchSize)) {
      const createResult = await this.createProducts(batch);
      const feed = await this.pollFeed(createResult.requestId);
      responses.push({
        requestId: createResult.requestId,
        feed,
        batch
      });
    }

    return responses;
  }

  async updateProductsInBatches(products, batchSize = 200) {
    const responses = [];

    for (const batch of chunk(products, batchSize)) {
      const updateResult = await this.updateProducts(batch);
      const feed = await this.pollFeed(updateResult.requestId);
      responses.push({
        requestId: updateResult.requestId,
        feed,
        batch
      });
    }

    return responses;
  }
}