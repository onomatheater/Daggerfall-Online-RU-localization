// Чтение распакованного пака в registerPack-форму {manifest, tables}.
// Распаковка zip — тонкий слой клиента/лаунчера (там свой unzip);
// здесь только локальные locale-version.json + ru.json, ноль сети.
// Нет манифеста / битый ru.json -> throw: лаунчер показывает причину.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function readPackDir(packDir) {
  const manPath = join(packDir, 'locale-version.json');
  if (!existsSync(manPath)) throw new Error(`load-pack: missing manifest: ${manPath}`);
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manPath, 'utf8'));
  } catch (err) {
    throw new Error(`load-pack: manifest invalid: ${err.message}`);
  }
  const ruPath = join(packDir, 'ru.json');
  if (!existsSync(ruPath)) throw new Error(`load-pack: missing ru.json: ${ruPath}`);
  let tables;
  try {
    tables = JSON.parse(readFileSync(ruPath, 'utf8'));
  } catch (err) {
    throw new Error(`load-pack: ru.json invalid: ${err.message}`);
  }
  if (!tables || typeof tables !== 'object') throw new Error('load-pack: ru.json must be {table: {key: value}}');
  return { manifest, tables };
}

if (process.argv[1]?.endsWith('load-pack.mjs')) {
  const loaded = readPackDir(process.argv[2] ?? 'dist/ru-pack');
  console.log(`pack ${loaded.manifest.version}, tables: ${Object.keys(loaded.tables).join(',')}`);
}
