# Shopify -> Falabella Seller Center Sync

Sincroniza productos, precios y stock desde Shopify/Odoo API hacia Falabella Seller Center.

## Reglas de negocio implementadas

- Crea y actualiza publicaciones en Falabella.
- Mapeo SKU: Shopify variant SKU <-> Falabella SellerSku.
- Precio Falabella = precio Shopify + 14%.
- Fuente de stock = Odoo API por SKU.
- Flujo de inventario = Odoo -> Shopify -> Falabella.
- Frecuencia por defecto = cada 5 minutos.
- Estado de publicación = active.
- Operador por defecto = `faco` para Colombia.
- Condición por defecto = `Nuevo`.

## Importante antes de publicar

Falabella exige atributos obligatorios por categoría. Este proyecto resuelve categorías por reglas locales o por sugerencia automática, pero no puede inventar atributos mandatorios que no existan en tu catálogo. Debes completar `data/category-rules.json` y `data/category-attributes.json` para tus categorías reales.

Si faltan atributos obligatorios, el sync no intentará crear el SKU en Falabella y lo dejará registrado en `data/sku-map.json` con el motivo del rechazo.

## Variables de entorno

Usa `.env.example` como base. Variables principales:

### Shopify

- `SHOPIFY_STORE`
- `SHOPIFY_ACCESS_TOKEN`
- `SHOPIFY_API_VERSION`
- `SHOPIFY_LOCATION_ID` opcional

### Odoo API

- `STOCK_SOURCE=odoo`
- `ODOO_BASE_URL`
- `ODOO_STOCK_PATH` (default: `/api/products`)
- `ODOO_API_TOKEN`
- `ODOO_POS_NAME` opcional
- `ODOO_POS_ID` opcional
- `ODOO_TIENDA` opcional como alias de selección
- `ODOO_LIMIT`
- `ODOO_TIMEOUT_MS`
- `STOCK_DEFAULT_WHEN_MISSING`

Se consulta con `GET /api/products?limit=<n>` usando token en header `Authorization: Bearer`.
El sincronizador toma el SKU desde `default_code` o campos equivalentes y la cantidad desde `pos_info`.
Si defines `ODOO_POS_NAME` o `ODOO_POS_ID`, usa sólo ese punto de venta. Si no defines ninguno, suma el stock de todos los POS del producto.

### Falabella

- `FALABELLA_BASE_URL`
- `FALABELLA_USER_ID`
- `FALABELLA_API_KEY`
- `FALABELLA_OPERATOR_CODE`
- `FALABELLA_DEFAULT_CATEGORY_ID` opcional
- `FALABELLA_DEFAULT_BRAND`
- `FALABELLA_DEFAULT_IMAGE_URL` opcional

## Archivos de configuración del catálogo

### `data/category-rules.json`

Prioridad usada por el sync:

1. `exactSku`
2. `skuPrefix`
3. `titleContains`
4. `productTypeContains`
5. `vendorContains`
6. `tagContains`
7. `FALABELLA_DEFAULT_CATEGORY_ID`
8. Sugerencia automática de Falabella por título

Ejemplo:

```json
{
  "exactSku": {
    "SKU-001": "12345"
  },
  "skuPrefix": {
    "ZAP-": "811"
  },
  "titleContains": {
    "tenis": "811"
  },
  "productTypeContains": {},
  "vendorContains": {},
  "tagContains": {}
}
```

### `data/category-attributes.json`

Usa `*` para atributos comunes y el id de categoría para overrides específicos.

Placeholders soportados:

- `{{sku}}`
- `{{title}}`
- `{{vendor}}`
- `{{productType}}`
- `{{variantTitle}}`
- `{{barcode}}`
- `{{handle}}`

Ejemplo:

```json
{
  "*": {
    "Product": {},
    "ProductData": {
      "ConditionType": "Nuevo",
      "PackageHeight": "10",
      "PackageWidth": "10",
      "PackageLength": "10",
      "PackageWeight": "1",
      "TaxPercentage": "19"
    }
  },
  "811": {
    "Product": {
      "Color": "Negro"
    },
    "ProductData": {
      "Genero": "Hombre",
      "DisciplinaZapatillas": "Running"
    }
  }
}
```

## Instalación

```bash
npm install
```

## Ejecutar una sincronización

```bash
npm run sync:once
```

## Ejecutar scheduler local

```bash
npm start
```

## GitHub Actions

Workflow incluido:

- `.github/workflows/sync-shopify-falabella.yml`

Secrets requeridos:

- `SHOPIFY_STORE`
- `SHOPIFY_ACCESS_TOKEN`
- `SHOPIFY_LOCATION_ID` opcional
- `ODOO_BASE_URL`
- `ODOO_API_TOKEN`
- `ODOO_TIENDA`
- `FALABELLA_USER_ID`
- `FALABELLA_API_KEY`
- `FALABELLA_OPERATOR_CODE`
- `FALABELLA_DEFAULT_CATEGORY_ID` opcional
- `FALABELLA_DEFAULT_BRAND` opcional
- `FALABELLA_DEFAULT_IMAGE_URL` opcional

## Flujo implementado

1. Consulta stock en Odoo por SKU.
2. Obtiene productos activos y variantes en Shopify.
3. Ajusta inventario de Shopify en la ubicación configurada.
4. Consulta catálogo actual de Falabella.
5. Si el SKU existe en Falabella, actualiza precio y stock con `ProductUpdate`.
6. Si no existe, resuelve categoría, valida atributos obligatorios y crea con `ProductCreate`.
7. Después de una creación exitosa, carga imágenes con `Image`.
8. Guarda el estado por SKU en `data/sku-map.json`.

## Notas operativas

- La firma de Falabella se construye con HMAC-SHA256 sobre los parámetros ordenados y codificados RFC 3986.
- `ProductCreate`, `ProductUpdate` e `Image` son asíncronos, por eso el proyecto consulta `FeedStatus` después de cada lote.
- El proyecto usa la API clásica documentada de Seller Center. La ruta `v2/product-set/{productSetId}/products` no está documentada públicamente de forma suficiente para implementarla con seguridad en esta base.
- Si una categoría no puede resolverse y tampoco defines `FALABELLA_DEFAULT_CATEGORY_ID`, la creación del SKU se omite.
- `data/sku-map.json` sirve como bitácora operativa, no como fuente maestra de catálogo.