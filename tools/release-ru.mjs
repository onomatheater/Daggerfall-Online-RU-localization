// Сборка релизного feed.json из готовых паков: манифест + url + sha256 zip.
// CI в репозитории нет (.github отсутствует) — релиз собирается руками или
// внешним контуром; этот модуль делает проверяемую часть: verifyPack гейтит
// пак, sha считается с zip, фид собирается через buildFeed.
// Битый пак или пропавший zip -> throw: частичный фид не публикуется молча.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { verifyPack } from './verify-pack.mjs';
import { buildFeed } from './feed-ru.mjs';

const manifestOf = (packDir) => {
  const { errors } = verifyPack(packDir);
  if (errors.length > 0) throw new Error(`release: pack refused:\n${errors.slice(0, 5).join('\n')}`);
  return JSON.parse(readFileSync(`${packDir}/locale-version.json`, 'utf8'));
};

export function releaseEntry({ zipPath, packDir, url, notes } = {}) {
  if (typeof url !== 'string' || url.length === 0) throw new Error('release: entry needs string url');
  const manifest = manifestOf(packDir);
  let bytes;
  try {
    bytes = readFileSync(zipPath);
  } catch {
    throw new Error(`release: missing zip file: ${zipPath}`);
  }
  const sha = createHash('sha256').update(bytes).digest('hex');
  const entry = { manifest, url, sha };
  if (notes !== undefined) entry.notes = notes;
  return entry;
}

export function buildReleaseFeed(items) {
  return buildFeed((items ?? []).map((item) => releaseEntry(item)));
}

if (process.argv[1]?.endsWith('release-ru.mjs')) {
  const { readFileSync: read, writeFileSync } = await import('node:fs');
  const args = process.argv.slice(2);
  const get = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
  const items = JSON.parse(read(get('--in'), 'utf8'));
  writeFileSync(get('--out'), JSON.stringify(buildReleaseFeed(items), null, 2) + '\n');
  console.log(`release feed: ${items.length} packs`);
}
