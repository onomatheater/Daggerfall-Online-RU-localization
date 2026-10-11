// Хранилище zip паков: предыдущие версии остаются на диске,
// откат — выбор прошлого файла, не переустановка игры.
// Локальный fs, ноль сети. Индекс — обычный JSON; битый индекс
// ведёт себя как пустое хранилище (не throw, клиент живёт дальше).
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const INDEX = 'index.json';
const DEFAULT_KEEP = 3;

const fileOf = (version) => `ru-pack-${version}.zip`;

function readIndex(storeDir) {
  try {
    const parsed = JSON.parse(readFileSync(join(storeDir, INDEX), 'utf8'));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e) => e && typeof e.version === 'string' && typeof e.file === 'string');
  } catch {
    return [];
  }
}

function writeIndex(storeDir, entries) {
  mkdirSync(storeDir, { recursive: true });
  writeFileSync(join(storeDir, INDEX), JSON.stringify(entries, null, 2) + '\n');
}

export function storePack(storeDir, { srcPath, version, game, sha, keep = DEFAULT_KEEP } = {}) {
  if (typeof srcPath !== 'string' || typeof version !== 'string' || typeof game !== 'string') {
    throw new Error('storePack: need {srcPath, version, game}');
  }
  mkdirSync(storeDir, { recursive: true });
  const file = fileOf(version);
  copyFileSync(srcPath, join(storeDir, file));
  const entry = { file, version, game, storedAt: new Date().toISOString() };
  if (sha !== undefined) entry.sha = sha;
  const rest = readIndex(storeDir).filter((e) => e.version !== version);
  const entries = [entry, ...rest].slice(0, Math.max(1, keep));
  const pruned = rest.slice(Math.max(1, keep) - 1).map((e) => e.version);
  for (const old of rest.slice(Math.max(1, keep) - 1)) {
    const path = join(storeDir, old.file);
    if (existsSync(path)) rmSync(path);
  }
  writeIndex(storeDir, entries);
  return { ok: true, stored: version, pruned };
}

export function listPacks(storeDir) {
  return readIndex(storeDir);
}

export function rollbackPack(storeDir) {
  const entries = readIndex(storeDir).filter((e) => existsSync(join(storeDir, e.file)));
  return entries.length >= 2 ? entries[1] : null;
}

if (process.argv[1]?.endsWith('pack-store.mjs')) {
  const [cmd, storeDir, arg] = process.argv.slice(2);
  if (cmd === 'list') console.log(JSON.stringify(listPacks(storeDir ?? '.'), null, 2));
  else if (cmd === 'rollback') console.log(JSON.stringify(rollbackPack(storeDir ?? '.')));
  else if (cmd === 'store') {
    const meta = JSON.parse(arg ?? '{}');
    console.log(JSON.stringify(storePack(storeDir ?? '.', meta)));
  } else {
    console.log('usage: pack-store.mjs <list|rollback|store> <storeDir> [metaJson]');
    process.exit(2);
  }
}
