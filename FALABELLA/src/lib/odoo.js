import axios from 'axios';
import xmlrpc from 'xmlrpc';

import { config } from '../config.js';
import { logger } from '../logger.js';
import { normalizeSku, toInt } from '../utils.js';

function asArray(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function collectRecords(payload) {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  const knownListKeys = ['data', 'items', 'results', 'inventario', 'inventory', 'rows'];
  for (const key of knownListKeys) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }

  return [];
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function pickSku(record) {
  const candidates = [
    record?.sku,
    record?.SKU,
    record?.default_code,
    record?.codigo,
    record?.product_code,
    record?.reference
  ];

  for (const candidate of candidates) {
    const value = normalizeSku(candidate);
    if (value) {
      return value;
    }
  }

  return '';
}

function pickPosStock(record) {
  const posInfo = asArray(record?.pos_info);
  if (posInfo.length === 0) {
    return null;
  }

  const targetPosId = normalizeText(config.stock.odoo.posId);
  const targetPosName = normalizeText(config.stock.odoo.posName || config.stock.odoo.tienda);

  const matched = posInfo.find((entry) => {
    const entryId = normalizeText(entry?.id);
    const entryName = normalizeText(entry?.pos || entry?.name);

    if (targetPosId && entryId === targetPosId) {
      return true;
    }

    if (targetPosName && entryName === targetPosName) {
      return true;
    }

    return false;
  });

  if (matched) {
    return pickQuantity(matched, false);
  }

  if (targetPosId || targetPosName) {
    return config.stock.defaultWhenMissing;
  }

  return posInfo.reduce((sum, entry) => sum + pickQuantity(entry, false), 0);
}

function pickQuantity(record, includePosInfo = true) {
  if (includePosInfo) {
    const posQuantity = pickPosStock(record);
    if (posQuantity !== null) {
      return posQuantity;
    }
  }

  const candidates = [
    record?.quantity,
    record?.qty,
    record?.cantidad,
    record?.stock,
    record?.available
  ];

  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value)) {
      return Math.max(0, toInt(value, 0));
    }
  }

  return config.stock.defaultWhenMissing;
}

function hasXmlRpcCredentials() {
  return Boolean(
    config.stock.odoo.xmlrpcDb
      && config.stock.odoo.xmlrpcUsername
      && config.stock.odoo.xmlrpcApiKey
  );
}

function createXmlRpcClient(baseUrl, endpoint) {
  const targetUrl = new URL(endpoint, `${baseUrl.replace(/\/$/, '')}/`).toString();
  return xmlrpc.createClient({
    url: targetUrl,
    headers: {
      'User-Agent': 'shopify-falabella-sync/1.0'
    }
  });
}

function xmlRpcCall(client, method, params) {
  return new Promise((resolve, reject) => {
    client.methodCall(method, params, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });
  });
}

async function resolveWarehouseId(modelsClient, uid) {
  const configuredWarehouseId = Number(config.stock.odoo.warehouseId || 0);
  if (configuredWarehouseId > 0) {
    return configuredWarehouseId;
  }

  if (!config.stock.odoo.warehouseName) {
    return null;
  }

  const ids = await xmlRpcCall(modelsClient, 'execute_kw', [
    config.stock.odoo.xmlrpcDb,
    uid,
    config.stock.odoo.xmlrpcApiKey,
    'stock.warehouse',
    'search',
    [[['name', 'ilike', config.stock.odoo.warehouseName]]],
    { limit: 1 }
  ]);

  if (!Array.isArray(ids) || ids.length === 0) {
    return null;
  }

  return Number(ids[0]);
}

async function loadOdooStockBySkuXmlRpc() {
  const commonClient = createXmlRpcClient(config.stock.odoo.baseUrl, '/xmlrpc/2/common');
  const modelsClient = createXmlRpcClient(config.stock.odoo.baseUrl, '/xmlrpc/2/object');

  const uid = await xmlRpcCall(commonClient, 'authenticate', [
    config.stock.odoo.xmlrpcDb,
    config.stock.odoo.xmlrpcUsername,
    config.stock.odoo.xmlrpcApiKey,
    {}
  ]);

  if (!uid) {
    throw new Error('Odoo XML-RPC authentication failed');
  }

  const warehouseId = await resolveWarehouseId(modelsClient, uid);
  const stockMap = new Map();
  let offset = 0;
  const pageSize = Math.max(1, Number(config.stock.odoo.limit || 10000));

  while (true) {
    const products = await xmlRpcCall(modelsClient, 'execute_kw', [
      config.stock.odoo.xmlrpcDb,
      uid,
      config.stock.odoo.xmlrpcApiKey,
      'product.product',
      'search_read',
      [[['default_code', '!=', false]]],
      {
        fields: ['default_code', 'qty_available'],
        offset,
        limit: pageSize,
        context: warehouseId ? { warehouse: warehouseId } : {}
      }
    ]);

    const rows = Array.isArray(products) ? products : [];
    for (const row of rows) {
      const sku = normalizeSku(row?.default_code);
      if (!sku) {
        continue;
      }

      const qty = Number(row?.qty_available);
      const quantity = Number.isFinite(qty)
        ? Math.max(0, toInt(qty, 0))
        : config.stock.defaultWhenMissing;
      stockMap.set(sku, quantity);
    }

    if (rows.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  logger.info('Loaded stock from Odoo XML-RPC', {
    distinctSkus: stockMap.size,
    warehouseName: config.stock.odoo.warehouseName,
    warehouseId: warehouseId || ''
  });

  return stockMap;
}

export async function loadOdooStockBySku() {
  if (hasXmlRpcCredentials()) {
    return loadOdooStockBySkuXmlRpc();
  }

  const client = axios.create({
    baseURL: config.stock.odoo.baseUrl,
    timeout: config.stock.odoo.timeoutMs
  });

  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${config.stock.odoo.apiToken}`,
    'X-API-Key': config.stock.odoo.apiToken
  };

  let data;
  try {
    const response = await client.get(config.stock.odoo.path, {
      headers,
      params: {
        limit: config.stock.odoo.limit
      }
    });
    data = response.data;
  } catch (error) {
    const status = Number(error?.response?.status || 0);
    if ((status === 404 || status === 401 || status === 403) && hasXmlRpcCredentials()) {
      logger.warn('Odoo REST endpoint failed, falling back to XML-RPC', {
        status,
        path: config.stock.odoo.path
      });
      return loadOdooStockBySkuXmlRpc();
    }

    throw error;
  }

  const records = collectRecords(data);
  const stockMap = new Map();

  for (const record of asArray(records)) {
    const sku = pickSku(record);
    if (!sku) {
      continue;
    }

    stockMap.set(sku, pickQuantity(record));
  }

  logger.info('Loaded stock from Odoo API', {
    records: records.length,
    distinctSkus: stockMap.size,
    tienda: config.stock.odoo.tienda,
    posName: config.stock.odoo.posName,
    posId: config.stock.odoo.posId
  });

  return stockMap;
}