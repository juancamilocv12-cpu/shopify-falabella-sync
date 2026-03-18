import { Pool } from 'pg';

import { config } from '../config.js';
import { logger } from '../logger.js';
import { normalizeSku, toInt } from '../utils.js';

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: config.stock.postgres.connectionString,
      ssl: config.stock.postgres.ssl
        ? { rejectUnauthorized: config.stock.postgres.sslRejectUnauthorized }
        : false
    });
  }

  return pool;
}

export async function loadStockBySku() {
  if (config.stock.source !== 'postgres') {
    throw new Error(`Unsupported STOCK_SOURCE: ${config.stock.source}`);
  }

  const query = config.stock.postgres.query;
  const usesBranchParam = query.includes('$1');
  const values = usesBranchParam ? [config.stock.postgres.branchId] : [];
  const result = await getPool().query(query, values);

  const stockMap = new Map();
  for (const row of result.rows) {
    const sku = normalizeSku(row.sku);
    if (!sku) {
      continue;
    }

    stockMap.set(sku, Math.max(0, toInt(row.quantity, config.stock.defaultWhenMissing)));
  }

  logger.info('Loaded stock from PostgreSQL', { rows: result.rowCount, distinctSkus: stockMap.size });
  return stockMap;
}

export async function closePostgres() {
  if (!pool) {
    return;
  }

  await pool.end();
  pool = undefined;
}