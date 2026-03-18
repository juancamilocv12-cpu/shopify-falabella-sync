import dotenv from 'dotenv';

dotenv.config();

function readBoolean(name, defaultValue = false) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function readNumber(name, defaultValue = 0) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric env var ${name}: ${value}`);
  }

  return parsed;
}

function readRequired(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }

  return value;
}

function readOptional(name, defaultValue = '') {
  const value = process.env[name];
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  return value;
}

const stockSource = process.env.STOCK_SOURCE || 'odoo';

function requiredIf(condition, name, fallback = '') {
  return condition ? readRequired(name) : readOptional(name, fallback);
}

export const config = {
  app: {
    syncFrequencyMinutes: readNumber('SYNC_FREQUENCY_MINUTES', 5),
    maxProductsPerRun: readNumber('MAX_PRODUCTS_PER_RUN', 0),
    priceMarkupPercent: readNumber('PRICE_MARKUP_PERCENT', 14),
    minPrice: readNumber('MIN_PRICE', 0),
    syncOnlySabanas: readBoolean('SYNC_ONLY_SABANAS', false)
  },
  shopify: {
    store: readRequired('SHOPIFY_STORE'),
    accessToken: readRequired('SHOPIFY_ACCESS_TOKEN'),
    apiVersion: process.env.SHOPIFY_API_VERSION || '2025-01',
    locationId: process.env.SHOPIFY_LOCATION_ID || ''
  },
  stock: {
    source: stockSource,
    defaultWhenMissing: readNumber('STOCK_DEFAULT_WHEN_MISSING', 0),
    postgres: {
      connectionString: requiredIf(stockSource === 'postgres', 'POSTGRES_CONNECTION_STRING'),
      query: requiredIf(stockSource === 'postgres', 'POSTGRES_STOCK_QUERY'),
      branchId: readOptional('POSTGRES_BRANCH_ID'),
      ssl: readBoolean('POSTGRES_SSL', true),
      sslRejectUnauthorized: readBoolean('POSTGRES_SSL_REJECT_UNAUTHORIZED', false)
    },
    odoo: {
      baseUrl: requiredIf(stockSource === 'odoo', 'ODOO_BASE_URL'),
      path: readOptional('ODOO_STOCK_PATH', '/api/products'),
      apiToken: requiredIf(stockSource === 'odoo', 'ODOO_API_TOKEN'),
      tienda: readOptional('ODOO_TIENDA'),
      posName: readOptional('ODOO_POS_NAME'),
      posId: readOptional('ODOO_POS_ID'),
      limit: readNumber('ODOO_LIMIT', 10000),
      timeoutMs: readNumber('ODOO_TIMEOUT_MS', 60000)
    },
    static: {
      quantity: readNumber('STATIC_STOCK_QUANTITY', readNumber('STOCK_DEFAULT_WHEN_MISSING', 0))
    }
  },
  falabella: {
    baseUrl: process.env.FALABELLA_BASE_URL || 'https://sellercenter-api.falabella.com/',
    userId: readRequired('FALABELLA_USER_ID'),
    apiKey: readRequired('FALABELLA_API_KEY'),
    version: process.env.FALABELLA_VERSION || '1.0',
    format: process.env.FALABELLA_FORMAT || 'XML',
    operatorCode: process.env.FALABELLA_OPERATOR_CODE || 'faco',
    defaultCategoryId: process.env.FALABELLA_DEFAULT_CATEGORY_ID || '',
    defaultBrand: process.env.FALABELLA_DEFAULT_BRAND || 'Generico',
    defaultStatus: process.env.FALABELLA_DEFAULT_STATUS || 'active',
    defaultConditionType: process.env.FALABELLA_DEFAULT_CONDITION_TYPE || 'Nuevo',
    defaultPackageHeight: readNumber('FALABELLA_DEFAULT_PACKAGE_HEIGHT', 10),
    defaultPackageWidth: readNumber('FALABELLA_DEFAULT_PACKAGE_WIDTH', 10),
    defaultPackageLength: readNumber('FALABELLA_DEFAULT_PACKAGE_LENGTH', 10),
    defaultPackageWeight: readNumber('FALABELLA_DEFAULT_PACKAGE_WEIGHT', 1),
    defaultTaxPercentage: String(process.env.FALABELLA_DEFAULT_TAX_PERCENTAGE || '19'),
    defaultMaterial: readOptional('FALABELLA_DEFAULT_MATERIAL', 'No aplica'),
    defaultVariation: readOptional('FALABELLA_DEFAULT_VARIATION', 'Default'),
    defaultTipoFundaPlumon: readOptional('FALABELLA_DEFAULT_TIPO_FUNDA_PLUMON', 'No aplica'),
    defaultTipoMantaPiecera: readOptional('FALABELLA_DEFAULT_TIPO_MANTA_PIECERA', 'No aplica'),
    defaultPosicionDescanso: readOptional('FALABELLA_DEFAULT_POSICION_DESCANSO', 'Todas'),
    defaultMaterialJuegoSabanas: readOptional('FALABELLA_DEFAULT_MATERIAL_JUEGO_SABANAS', 'Microfibra'),
    defaultTipoSabana: readOptional('FALABELLA_DEFAULT_TIPO_SABANA', 'Juego de sabanas'),
    defaultNumeroHilos: readOptional('FALABELLA_DEFAULT_NUMERO_HILOS', '144'),
    defaultColorBasico: readOptional('FALABELLA_DEFAULT_COLOR_BASICO', 'Blanco'),
    defaultTamanoCama: readOptional('FALABELLA_DEFAULT_TAMANO_CAMA', 'Doble'),
    defaultImageUrl: process.env.FALABELLA_DEFAULT_IMAGE_URL || '',
    skipImageUpload: readBoolean('FALABELLA_SKIP_IMAGE_UPLOAD', false),
    feedPollAttempts: readNumber('FALABELLA_FEED_POLL_ATTEMPTS', 12),
    feedPollIntervalMs: readNumber('FALABELLA_FEED_POLL_INTERVAL_MS', 5000)
  }
};