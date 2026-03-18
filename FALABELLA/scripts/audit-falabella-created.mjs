import { readFile } from 'node:fs/promises';

import '../src/config.js';
import { FalabellaClient } from '../src/lib/falabella.js';

async function main() {
  const raw = await readFile('data/sku-map.json', 'utf8');
  const map = JSON.parse(raw);

  const createdEntries = Object.entries(map)
    .filter(([, value]) => value?.status === 'created')
    .map(([sku, value]) => ({
      sku,
      lastFeedId: value.lastFeedId || '',
      lastSyncedAt: value.lastSyncedAt || ''
    }));

  console.log(`LOCAL_CREATED_COUNT=${createdEntries.length}`);

  const client = new FalabellaClient();
  const allProducts = await client.getAllProducts();
  const bySku = new Map(allProducts.map((product) => [String(product.sellerSku), product]));

  const present = [];
  const missing = [];
  for (const entry of createdEntries) {
    if (bySku.has(entry.sku)) {
      present.push(entry.sku);
    } else {
      missing.push(entry.sku);
    }
  }

  console.log(`FALABELLA_PRODUCTS_COUNT=${allProducts.length}`);
  console.log(`PRESENT_IN_FALABELLA=${present.length}`);
  console.log(`MISSING_IN_FALABELLA=${missing.length}`);
  if (missing.length > 0) {
    console.log(`MISSING_SKUS=${missing.join(',')}`);
  }

  const feedIds = [...new Set(createdEntries.map((entry) => entry.lastFeedId).filter(Boolean))];
  for (const feedId of feedIds) {
    const feed = await client.pollFeed(feedId);
    console.log(`FEED ${feedId} STATUS=${feed.status} TOTAL=${feed.totalRecords} PROCESSED=${feed.processedRecords} FAILED=${feed.failedRecords}`);
  }
}

main().catch((error) => {
  console.error('AUDIT_ERROR', error.message);
  if (error.details) {
    console.error(JSON.stringify(error.details));
  }
  process.exitCode = 1;
});