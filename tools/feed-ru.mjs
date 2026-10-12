// Фид паков перевода: какие ru-pack.zip подходят какой игре.
// Сети здесь нет: только локальные манифесты -> feed.json строкой.
// Выбор — через isCompatible/choosePack из src/locale/loader.js:
// пак без клейма или с чужим диапазоном молча пропускается (selectPack -> null,
// клиент остаётся на старом паке / EN-фолбэке, не краш).
import { parseManifest, choosePack, cmpVersion } from '../src/locale/loader.js';

export function buildFeed(entries) {
  const packs = (entries ?? []).map((entry, i) => {
    if (!entry || typeof entry !== 'object' || typeof entry.url !== 'string' || entry.url.length === 0) {
      throw new Error(`feed: entry ${i} needs string url`);
    }
    const manifest = parseManifest(JSON.stringify(entry.manifest));
    const record = { ...manifest, url: entry.url };
    if (entry.sha !== undefined) record.sha = entry.sha;
    if (entry.notes !== undefined) {
      if (!Array.isArray(entry.notes) || !entry.notes.every((n) => typeof n === 'string')) {
        throw new Error(`feed: entry ${i} notes must be string[]`);
      }
      record.notes = entry.notes;
    }
    return record;
  });
  packs.sort((a, b) => cmpVersion(a.version, b.version));
  return { generated: new Date().toISOString(), packs };
}

export function selectPack(feedText, gameVersion) {
  let feed;
  try {
    feed = JSON.parse(String(feedText));
  } catch {
    throw new Error('feed: not JSON');
  }
  if (!feed || !Array.isArray(feed.packs)) throw new Error('feed: need packs[]');
  return choosePack(feed.packs, gameVersion);
}

if (process.argv[1]?.endsWith('feed-ru.mjs')) {
  const { readFileSync, writeFileSync } = await import('node:fs');
  const args = process.argv.slice(2);
  const get = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
  const entries = JSON.parse(readFileSync(get('--in'), 'utf8'));
  writeFileSync(get('--out'), JSON.stringify(buildFeed(entries), null, 2) + '\n');
  console.log(`feed: ${entries.length} entries`);
}
