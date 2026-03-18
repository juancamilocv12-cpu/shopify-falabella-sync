export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function chunk(array, size) {
  const chunks = [];
  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size));
  }
  return chunks;
}

export function asArray(value) {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

export function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeSku(value) {
  return String(value || '').trim();
}

export function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))];
}

export function ensureArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

export function clampString(text, maxLength) {
  if (!text) {
    return '';
  }

  return String(text).slice(0, maxLength);
}

export function sanitizeHtmlDescription(description, fallbackText) {
  const source = String(description || fallbackText || '').trim();
  if (!source) {
    return 'Producto sincronizado desde Shopify';
  }

  return source;
}

export function applyMarkup(price, markupPercent, minPrice) {
  const basePrice = toNumber(price, 0);
  const calculatedPrice = Math.round(basePrice * (1 + markupPercent / 100));
  return Math.max(calculatedPrice, toNumber(minPrice, 0));
}

export function isoTimestamp() {
  return new Date().toISOString();
}

export function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildPlaceholderContext(variant) {
  return {
    sku: variant.sku,
    title: variant.productTitle,
    vendor: variant.vendor,
    productType: variant.productType,
    variantTitle: variant.variantTitle,
    barcode: variant.barcode,
    handle: variant.handle
  };
}

export function interpolateTemplate(value, context) {
  if (typeof value !== 'string') {
    return value;
  }

  return value.replace(/{{\s*(\w+)\s*}}/g, (_, key) => {
    return context[key] === undefined || context[key] === null ? '' : String(context[key]);
  });
}