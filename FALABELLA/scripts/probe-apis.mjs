import axios from 'axios';

import '../src/config.js';
import { FalabellaClient } from '../src/lib/falabella.js';

async function probeShopifyVersion(version) {
  const client = axios.create({
    baseURL: `https://${process.env.SHOPIFY_STORE}/admin/api/${version}`,
    headers: {
      'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json'
    },
    timeout: 60000,
    validateStatus: () => true
  });

  const response = await client.post('/graphql.json', {
    query: 'query { shop { name } }'
  });

  return {
    version,
    status: response.status,
    data: response.data
  };
}

async function probeShopify() {
  const versions = [
    process.env.SHOPIFY_API_VERSION || '2025-01',
    '2026-01',
    '2025-10',
    '2025-07',
    'unstable'
  ];

  const uniqueVersions = [...new Set(versions)];
  const results = [];
  for (const version of uniqueVersions) {
    results.push(await probeShopifyVersion(version));
  }

  return results;
}

async function probeFalabella() {
  const client = new FalabellaClient();

  try {
    const response = await client.request({
      action: 'GetProducts',
      method: 'GET',
      params: {
        Filter: 'all',
        Limit: 1,
        Offset: 0
      }
    });

    return {
      ok: true,
      data: response
    };
  } catch (error) {
    return {
      ok: false,
      message: error.message,
      details: error.details || null
    };
  }
}

const shopifyResults = await probeShopify();
for (const shopify of shopifyResults) {
  console.log('SHOPIFY_VERSION', shopify.version);
  console.log('SHOPIFY_STATUS', shopify.status);
  console.log('SHOPIFY_DATA', JSON.stringify(shopify.data).slice(0, 1000));
}

const falabella = await probeFalabella();
console.log('FALABELLA_OK', falabella.ok);
console.log('FALABELLA_DATA', JSON.stringify(falabella).slice(0, 1000));