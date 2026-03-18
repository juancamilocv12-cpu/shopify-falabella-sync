import { promises as fs } from 'node:fs';
import path from 'node:path';

const skuMapPath = path.resolve(process.cwd(), 'data', 'sku-map.json');

async function ensureFile() {
  try {
    await fs.access(skuMapPath);
  } catch {
    await fs.mkdir(path.dirname(skuMapPath), { recursive: true });
    await fs.writeFile(skuMapPath, '{}\n', 'utf8');
  }
}

export async function readSkuMap() {
  await ensureFile();
  const raw = await fs.readFile(skuMapPath, 'utf8');
  return JSON.parse(raw || '{}');
}

export async function writeSkuMap(map) {
  await ensureFile();
  const serialized = `${JSON.stringify(map, null, 2)}\n`;
  await fs.writeFile(skuMapPath, serialized, 'utf8');
}

export async function upsertSkuMap(updates) {
  const current = await readSkuMap();
  for (const [sku, payload] of Object.entries(updates)) {
    current[sku] = {
      ...(current[sku] || {}),
      ...payload
    };
  }
  await writeSkuMap(current);
  return current;
}