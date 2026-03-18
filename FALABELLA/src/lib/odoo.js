import axios from 'axios';

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

export async function loadOdooStockBySku() {
  const client = axios.create({
    baseURL: config.stock.odoo.baseUrl,
    timeout: config.stock.odoo.timeoutMs
  });

  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${config.stock.odoo.apiToken}`,
    'X-API-Key': config.stock.odoo.apiToken
  };

  const { data } = await client.get(config.stock.odoo.path, {
    headers,
    params: {
      limit: config.stock.odoo.limit
    }
  });

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