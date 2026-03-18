import '../src/config.js';
import { FalabellaClient } from '../src/lib/falabella.js';

const categoryId = process.argv[2] || '1272';
const query = (process.argv[3] || 'Variation').toLowerCase();

const client = new FalabellaClient();
const response = await client.request({
  action: 'GetCategoryAttributes',
  method: 'GET',
  params: {
    PrimaryCategory: categoryId
  }
});

function toArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

const body = response?.SuccessResponse?.Body || response?.Body || {};
const sources = [
  body?.AttributeSets?.AttributeSet,
  body?.AttributeSet,
  body?.Attribute,
  body?.Attributes?.Attribute
];

let attrs = [];
for (const source of sources) {
  for (const set of toArray(source)) {
    const maybe = toArray(set?.Attributes?.Attribute || set?.Attribute || set);
    attrs = attrs.concat(maybe);
  }
}

const matches = attrs.filter((attribute) => {
  const name = String(attribute?.Name || '').toLowerCase();
  const feedName = String(attribute?.FeedName || '').toLowerCase();
  return name.includes(query) || feedName.includes(query);
});
console.log(`MATCHES=${matches.length}`);
for (const item of matches) {
  console.log(JSON.stringify(item).slice(0, 10000));
}