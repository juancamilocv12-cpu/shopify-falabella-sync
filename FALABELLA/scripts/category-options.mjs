import '../src/config.js';
import { FalabellaClient } from '../src/lib/falabella.js';

const categoryId = process.argv[2] || '1272';
const client = new FalabellaClient();

const response = await client.request({
  action: 'GetCategoryAttributes',
  method: 'GET',
  params: {
    PrimaryCategory: categoryId
  }
});

const body = response?.SuccessResponse?.Body || response?.Body || {};
const attrSets =
  body?.AttributeSets?.AttributeSet ||
  body?.AttributeSet ||
  body?.Attribute ||
  body?.Attributes?.Attribute ||
  [];
const sets = Array.isArray(attrSets) ? attrSets : [attrSets];

function toArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

const interesting = ['Variation', 'TipoDeSabana', 'NumeroDeHilos', 'ColorBasico', 'MaterialDeJuegoDeSabanas', 'TamanoDeLaCama', 'ColorVariant', 'ColorBasicoVariant', 'TamanoCamaVariant'];

let printed = 0;
for (const set of sets) {
  const attrs = toArray(set?.Attributes?.Attribute || set?.Attribute || set);
  for (const attr of attrs) {
    const feedName = String(attr?.FeedName || '');
    if (!interesting.includes(feedName)) {
      continue;
    }

    const optionsRaw = toArray(attr?.Options?.Option || attr?.Option);
    const options = optionsRaw
      .map((option) => {
        if (typeof option === 'string') {
          return option;
        }
        return option?.Name || option?.Value || option?.Label || JSON.stringify(option);
      })
      .filter(Boolean);

    console.log(`ATTR ${feedName} | mandatory=${attr?.isMandatory || attr?.IsMandatory || ''} | type=${attr?.AttributeType || ''} | group=${attr?.GroupName || ''}`);
    console.log(`OPTIONS ${JSON.stringify(options).slice(0, 4000)}`);
    printed += 1;
  }
}

if (printed === 0) {
  console.log('NO_INTERESTING_ATTRIBUTES_FOUND');
  console.log(JSON.stringify(response).slice(0, 8000));
}