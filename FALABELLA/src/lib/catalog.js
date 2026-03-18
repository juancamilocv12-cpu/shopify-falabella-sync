import { promises as fs } from 'node:fs';
import path from 'node:path';

import { config } from '../config.js';
import { buildPlaceholderContext, clampString, interpolateTemplate, sanitizeHtmlDescription } from '../utils.js';

const categoryRulesPath = path.resolve(process.cwd(), 'data', 'category-rules.json');
const categoryAttributesPath = path.resolve(process.cwd(), 'data', 'category-attributes.json');

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function normalizeRuleValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return { categoryId: String(value) };
  }

  return {
    categoryId: value.categoryId ? String(value.categoryId) : '',
    overrides: value
  };
}

function findRuleMatch(variant, rules) {
  const sku = variant.sku;
  const title = (variant.productTitle || '').toLowerCase();
  const productType = (variant.productType || '').toLowerCase();
  const vendor = (variant.vendor || '').toLowerCase();
  const tags = variant.tags.map((tag) => String(tag).toLowerCase());

  if (rules.exactSku?.[sku]) {
    return normalizeRuleValue(rules.exactSku[sku]);
  }

  for (const [prefix, value] of Object.entries(rules.skuPrefix || {})) {
    if (sku.startsWith(prefix)) {
      return normalizeRuleValue(value);
    }
  }

  for (const [needle, value] of Object.entries(rules.titleContains || {})) {
    if (title.includes(needle.toLowerCase())) {
      return normalizeRuleValue(value);
    }
  }

  for (const [needle, value] of Object.entries(rules.productTypeContains || {})) {
    if (productType.includes(needle.toLowerCase())) {
      return normalizeRuleValue(value);
    }
  }

  for (const [needle, value] of Object.entries(rules.vendorContains || {})) {
    if (vendor.includes(needle.toLowerCase())) {
      return normalizeRuleValue(value);
    }
  }

  for (const [needle, value] of Object.entries(rules.tagContains || {})) {
    if (tags.some((tag) => tag.includes(needle.toLowerCase()))) {
      return normalizeRuleValue(value);
    }
  }

  return null;
}

function mergeTemplateData(commonTemplate, categoryTemplate, context) {
  const mergedProduct = {
    ...(commonTemplate?.Product || {}),
    ...(categoryTemplate?.Product || {})
  };
  const mergedProductData = {
    ...(commonTemplate?.ProductData || {}),
    ...(categoryTemplate?.ProductData || {})
  };

  const productAttributes = Object.fromEntries(
    Object.entries(mergedProduct).map(([key, value]) => [key, interpolateTemplate(value, context)])
  );
  const productData = Object.fromEntries(
    Object.entries(mergedProductData).map(([key, value]) => [key, interpolateTemplate(value, context)])
  );

  return {
    productAttributes,
    productData
  };
}

function normalizeAttributeKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function baseMappedAttributeAliases() {
  return {
    sellersku: ['seller_sku', 'sellersku'],
    name: ['name'],
    primarycategory: ['primary_category', 'primarycategory'],
    description: ['description'],
    brand: ['brand'],
    conditiontype: ['condition_type', 'conditiontype'],
    packageheight: ['package_height', 'packageheight'],
    packagewidth: ['package_width', 'packagewidth'],
    packagelength: ['package_length', 'packagelength'],
    packageweight: ['package_weight', 'packageweight'],
    taxpercentage: ['tax_percentage', 'taxpercentage']
  };
}

function getOptionValue(variant, pattern) {
  const options = variant.selectedOptions || [];
  const found = options.find((option) => pattern.test(String(option.name || '')));
  return found ? String(found.value || '').trim() : '';
}

function inferThreadCount(variant) {
  const text = `${variant.productTitle || ''} ${variant.variantTitle || ''}`;
  const match = text.match(/(\d{2,4})\s*hilos?/i);
  if (match?.[1]) {
    return match[1];
  }

  return String(config.falabella.defaultNumeroHilos || '144');
}

function inferBasicColor(variant) {
  const color = getOptionValue(variant, /(color|colour)/i);
  if (color) {
    const cleaned = String(color).replace(/[^a-zA-Z\u00C0-\u017F]/g, ' ').trim().toLowerCase();
    if (cleaned.includes('blanc')) return 'Blanco';
    if (cleaned.includes('gris')) return 'Gris';
    if (cleaned.includes('beige')) return 'Beige';
    if (cleaned.includes('azul')) return 'Azul';
    if (cleaned.includes('negro')) return 'Negro';
    if (cleaned.includes('verde')) return 'Verde';
    if (cleaned.includes('rosa')) return 'Rosado';
    if (cleaned.includes('rojo')) return 'Rojo';
    if (cleaned.includes('marr') || cleaned.includes('cafe')) return 'Café';
    return config.falabella.defaultColorBasico || 'Blanco';
  }

  const text = `${variant.productTitle || ''} ${variant.variantTitle || ''}`.toLowerCase();
  const map = [
    ['blanco', 'Blanco'],
    ['gris', 'Gris'],
    ['beige', 'Beige'],
    ['azul', 'Azul'],
    ['negro', 'Negro'],
    ['verde', 'Verde'],
    ['rosa', 'Rosa'],
    ['marron', 'Marron']
  ];
  const found = map.find(([key]) => text.includes(key));
  return found ? found[1] : config.falabella.defaultColorBasico || 'Blanco';
}

function inferBedSize(variant) {
  const size = getOptionValue(variant, /(tamano|size|talla|cama)/i);
  if (size) {
    const cleaned = String(size).replace(/[^a-zA-Z0-9]/g, ' ').trim().toLowerCase();
    if (cleaned.includes('king')) return 'King';
    if (cleaned.includes('queen')) return 'Queen';
    if (cleaned.includes('semi')) return 'Semidoble';
    if (cleaned.includes('full')) return 'Full';
    if (cleaned.includes('infantil')) return 'Infantil';
    if (cleaned.includes('sencillo') || cleaned.includes('single')) return 'Sencillo';
    if (cleaned.includes('doble')) return 'Doble';
    return config.falabella.defaultTamanoCama || 'Doble';
  }

  const text = `${variant.productTitle || ''} ${variant.variantTitle || ''}`.toLowerCase();
  const map = [
    ['king', 'King'],
    ['queen', 'Queen'],
    ['doble', 'Doble'],
    ['semidoble', 'Semidoble'],
    ['sencillo', 'Sencillo'],
    ['single', 'Sencillo']
  ];
  const found = map.find(([key]) => text.includes(key));
  return found ? found[1] : config.falabella.defaultTamanoCama || 'Doble';
}

function getAttributeTargetKey(attribute) {
  return attribute.feedName || attribute.name;
}

function buildDynamicValue(attributeName, variant) {
  const normalized = normalizeAttributeKey(attributeName);
  const color = getOptionValue(variant, /(color|colour|color basico|color basico variant)/i);
  const size = inferBedSize(variant);
  const nonDefaultVariantTitle = variant.variantTitle && variant.variantTitle !== 'Default Title'
    ? variant.variantTitle
    : '';

  switch (normalized) {
    case 'variation':
      return inferBasicColor(variant);
    case 'material':
      return config.falabella.defaultMaterial || variant.productType || 'No aplica';
    case 'numerodehilos':
      return inferThreadCount(variant);
    case 'colorbasico':
      return inferBasicColor(variant);
    case 'materialdejuegodesabanas':
      return config.falabella.defaultMaterialJuegoSabanas || config.falabella.defaultMaterial || 'Microfibra';
    case 'tamanodelacama':
      return inferBedSize(variant);
    case 'tipodesabana':
      return config.falabella.defaultTipoSabana || 'Juego de sabanas';
    case 'colorvariant':
        return inferBasicColor(variant);
    case 'colorbasicovariant':
        return inferBasicColor(variant);
    case 'tamanocamavariant':
      return size || nonDefaultVariantTitle || 'Unico';
    default:
      return '';
  }
}

export async function loadCatalogRules() {
  const rules = await readJson(categoryRulesPath, {
    exactSku: {},
    skuPrefix: {},
    titleContains: {},
    productTypeContains: {},
    vendorContains: {},
    tagContains: {}
  });

  const attributes = await readJson(categoryAttributesPath, { '*': { Product: {}, ProductData: {} } });

  return { rules, attributes };
}

export async function resolveCategoryId(variant, falabellaClient, rules) {
  const matchedRule = findRuleMatch(variant, rules);
  if (matchedRule?.categoryId) {
    return {
      categoryId: matchedRule.categoryId,
      source: 'rule'
    };
  }

  if (config.falabella.defaultCategoryId) {
    return {
      categoryId: config.falabella.defaultCategoryId,
      source: 'default'
    };
  }

  const suggestion = await falabellaClient.getCategorySuggestion(variant.productTitle);
  return {
    categoryId: suggestion.categoryId,
    source: suggestion.categoryId ? 'suggestion' : 'missing'
  };
}

export async function buildCreatePayload(variant, stock, price, falabellaClient, catalog) {
  const categoryResolution = await resolveCategoryId(variant, falabellaClient, catalog.rules);
  if (!categoryResolution.categoryId) {
    return {
      ready: false,
      reason: 'missing_category',
      missingMandatoryAttributes: [],
      categoryId: ''
    };
  }

  const placeholderContext = buildPlaceholderContext(variant);
  const commonTemplate = catalog.attributes['*'] || { Product: {}, ProductData: {} };
  const categoryTemplate = catalog.attributes[categoryResolution.categoryId] || { Product: {}, ProductData: {} };
  const merged = mergeTemplateData(commonTemplate, categoryTemplate, placeholderContext);
  let categoryAttributes = [];
  try {
    categoryAttributes = await falabellaClient.getCategoryAttributes(categoryResolution.categoryId);
  } catch (error) {
    const errorCode = Number(error?.details?.Head?.ErrorCode || 0);
    if (errorCode === 57 || /No attribute sets linked|Invalid Category/i.test(String(error?.message || ''))) {
      return {
        ready: false,
        reason: 'invalid_category',
        missingMandatoryAttributes: [],
        categoryId: categoryResolution.categoryId
      };
    }

    throw error;
  }

  for (const attribute of categoryAttributes) {
    if (!attribute.mandatory || !attribute.name) {
      continue;
    }

    const targetKey = getAttributeTargetKey(attribute);
    const dynamicValue = buildDynamicValue(targetKey, variant);
    if (!dynamicValue) {
      continue;
    }

    const isSystem = (attribute.attributeType || '').toLowerCase() === 'system';
    const isVariationGroup = (attribute.groupName || '').toLowerCase() === 'variation';

    if (isSystem || isVariationGroup) {
      if (!Object.prototype.hasOwnProperty.call(merged.productAttributes, targetKey)) {
        merged.productAttributes[targetKey] = dynamicValue;
      }
      continue;
    }

    if (!Object.prototype.hasOwnProperty.call(merged.productData, targetKey)) {
      merged.productData[targetKey] = dynamicValue;
    }
  }

  const sentRootAttributes = new Set([
    ...Object.keys(merged.productAttributes),
    'SellerSku',
    'Name',
    'PrimaryCategory',
    'Description',
    'Brand',
    'ProductId'
  ]);
  const sentProductDataAttributes = new Set(Object.keys(merged.productData));

  const normalizedRoot = new Set([...sentRootAttributes].map(normalizeAttributeKey));
  const normalizedProductData = new Set([...sentProductDataAttributes].map(normalizeAttributeKey));

  const aliasMap = baseMappedAttributeAliases();
  for (const [canonical, aliases] of Object.entries(aliasMap)) {
    const isAlreadyPresent = normalizedRoot.has(canonical) || normalizedProductData.has(canonical);
    if (!isAlreadyPresent) {
      continue;
    }

    for (const alias of aliases) {
      const normalizedAlias = normalizeAttributeKey(alias);
      normalizedRoot.add(normalizedAlias);
      normalizedProductData.add(normalizedAlias);
    }
  }

  const missingMandatoryAttributes = categoryAttributes
    .filter((attribute) => attribute.mandatory && attribute.name)
    .filter((attribute) => {
      const normalizedRequired = normalizeAttributeKey(getAttributeTargetKey(attribute));

      const isSystem = (attribute.attributeType || '').toLowerCase() === 'system';
      const isVariationGroup = (attribute.groupName || '').toLowerCase() === 'variation';
      if (isSystem || isVariationGroup) {
        return !normalizedRoot.has(normalizedRequired);
      }

      return !normalizedRoot.has(normalizedRequired) && !normalizedProductData.has(normalizedRequired);
    })
    .map((attribute) => getAttributeTargetKey(attribute));

  if (missingMandatoryAttributes.length > 0) {
    return {
      ready: false,
      reason: 'missing_mandatory_attributes',
      missingMandatoryAttributes,
      categoryId: categoryResolution.categoryId
    };
  }

  const imageUrls = variant.imageUrls.slice(0, 8);
  if (imageUrls.length === 0 && config.falabella.defaultImageUrl) {
    imageUrls.push(config.falabella.defaultImageUrl);
  }

  const description = sanitizeHtmlDescription(variant.descriptionHtml, variant.productTitle);
  const payload = {
    SellerSku: variant.sku,
    ...(merged.productAttributes.ParentSku ? { ParentSku: merged.productAttributes.ParentSku } : {}),
    Name: clampString(variant.variantTitle && variant.variantTitle !== 'Default Title'
      ? `${variant.productTitle} - ${variant.variantTitle}`
      : variant.productTitle, 255),
    PrimaryCategory: categoryResolution.categoryId,
    Description: description,
    Brand: clampString(variant.vendor || config.falabella.defaultBrand, 255),
    ProductId: variant.barcode || '',
    ProductAttributes: Object.fromEntries(
      Object.entries(merged.productAttributes).filter(([key]) => key !== 'ParentSku')
    ),
    BusinessUnit: {
      OperatorCode: config.falabella.operatorCode,
      Price: price,
      Stock: stock,
      Status: config.falabella.defaultStatus
    },
    ProductData: {
      ConditionType: config.falabella.defaultConditionType,
      PackageHeight: String(config.falabella.defaultPackageHeight),
      PackageWidth: String(config.falabella.defaultPackageWidth),
      PackageLength: String(config.falabella.defaultPackageLength),
      PackageWeight: String(config.falabella.defaultPackageWeight),
      TaxPercentage: config.falabella.defaultTaxPercentage,
      ...merged.productData
    },
    imageUrls
  };

  return {
    ready: true,
    reason: 'ok',
    missingMandatoryAttributes: [],
    categoryId: categoryResolution.categoryId,
    payload
  };
}

export function buildUpdatePayload(variant, stock, price) {
  return {
    SellerSku: variant.sku,
    BusinessUnit: {
      OperatorCode: config.falabella.operatorCode,
      Price: price,
      Stock: stock,
      Status: config.falabella.defaultStatus
    },
    ProductData: {}
  };
}