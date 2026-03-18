import { config } from '../config.js';
import { loadOdooStockBySku } from './odoo.js';
import { closePostgres, loadStockBySku as loadPostgresStockBySku } from './postgres.js';

export async function loadStockBySku() {
  if (config.stock.source === 'static') {
    return new Map();
  }

  if (config.stock.source === 'odoo') {
    return loadOdooStockBySku();
  }

  if (config.stock.source === 'postgres') {
    return loadPostgresStockBySku();
  }

  throw new Error(`Unsupported STOCK_SOURCE: ${config.stock.source}`);
}

export async function closeStockSource() {
  if (config.stock.source === 'postgres') {
    await closePostgres();
  }
}