// Чтение распакованного пака в registerPack-форму {manifest, tables}.
// Распаковка zip — тонкий слой клиента/лаунчера (там свой unzip);
// здесь только локальные locale-version.json + ru.json, ноль сети.
// Нет манифеста / битый ru.json -> throw: лаунчер показывает причину.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseManifest, isCompatible, createOverlay } from '../src/locale/loader.js';

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

// Внешний пак из Prefs/Locale (ядро иммунитета): читает распакованный пак,
// гейтит по версии игры, регистрирует таблицы в overlay. Отказ —
// {ok:false, reason}, никогда throw: клиент живёт дальше на bundled EN.
export function loadExternalPack(packDir, gameVersion, bundled = { en: {} }) {
  let loaded;
  try {
    loaded = readPackDir(packDir);
  } catch (err) {
    return { ok: false, reason: String(err?.message ?? err) };
  }
  let manifest;
  try {
    manifest = parseManifest(JSON.stringify(loaded.manifest));
  } catch (err) {
    return { ok: false, reason: String(err?.message ?? err) };
  }
  if (!isCompatible(manifest, gameVersion)) {
    return { ok: false, reason: `load-pack: incompatible pack game=${manifest.game ?? `${manifest.gameMin}-${manifest.gameMax}`} for ${gameVersion}` };
  }
  const overlay = createOverlay(bundled);
  for (const [table, rows] of Object.entries(loaded.tables ?? {})) {
    overlay.register('ru', table, rows);
  }
  return { ok: true, overlay, manifest };
}

if (process.argv[1]?.endsWith('load-pack.mjs')) {
  const loaded = readPackDir(process.argv[2] ?? 'dist/ru-pack');
  console.log(`pack ${loaded.manifest.version}, tables: ${Object.keys(loaded.tables).join(',')}`);
}
