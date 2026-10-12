// NEED: релиз собирает feed.json из готовых паков — громко, без молчаливых дыр.
// - releaseEntry({zipPath, packDir, url}) проверяет пак через verifyPack,
//   считает sha256 zip, возвращает {manifest, url, sha} для buildFeed.
//   Битый пак или отсутствующий zip -> throw с ошибками (CI падает, а не
//   публикует частичный фид).
// - buildReleaseFeed(items) отдаёт готовый фид {generated, packs[]}.
// Локальный fs, ноль сети.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { pack } from '../tools/pack-ru.mjs';
import { buildReleaseFeed, releaseEntry } from '../tools/release-ru.mjs';
import { selectPack } from '../tools/feed-ru.mjs';

const mk = () => mkdtempSync(join(tmpdir(), 'rurel-'));

test('release entry carries manifest, url and real zip sha', () => {
  const packDir = mk();
  pack({ out: packDir, version: '1.3.0', gameMin: '7506', gameMax: '7553' });
  const zipPath = join(mk(), 'ru-pack-1.3.0.zip');
  writeFileSync(zipPath, 'zip-bytes-1.3.0');
  const entry = releaseEntry({ zipPath, packDir, url: 'https://example.invalid/ru-pack-1.3.0.zip', notes: ['Фикс шрифтов.'] });
  assert.equal(entry.manifest.version, '1.3.0');
  assert.equal(entry.url, 'https://example.invalid/ru-pack-1.3.0.zip');
  assert.deepEqual(entry.notes, ['Фикс шрифтов.']);
  assert.equal(entry.sha, createHash('sha256').update('zip-bytes-1.3.0', 'utf8').digest('hex'));
});

test('broken pack or missing zip fails loudly, never silently', () => {
  const packDir = mk();
  pack({ out: packDir, version: '1.0.0' });
  writeFileSync(join(packDir, 'ru.json'), 'not json{');
  const zipPath = join(mk(), 'ru-pack.zip');
  writeFileSync(zipPath, 'bytes');
  assert.throws(() => releaseEntry({ zipPath, packDir, url: 'https://example.invalid/x.zip' }), /verify|errors|invalid/);
  const goodDir = mk();
  pack({ out: goodDir, version: '1.0.0', game: '7553' });
  assert.throws(() => releaseEntry({ zipPath: join(mk(), 'nope.zip'), packDir: goodDir, url: 'https://example.invalid/x.zip' }), /missing|sha|file/);
});

test('release feed roundtrips through selectPack', () => {
  const packDir = mk();
  pack({ out: packDir, version: '1.3.0', gameMin: '7506', gameMax: '7553' });
  const zipPath = join(mk(), 'ru-pack.zip');
  writeFileSync(zipPath, 'bytes');
  const feed = buildReleaseFeed([{ zipPath, packDir, url: 'https://example.invalid/ru-pack.zip' }]);
  assert.equal(feed.packs.length, 1);
  const sel = selectPack(JSON.stringify(feed), '7553');
  assert.equal(sel.version, '1.3.0');
  assert.ok(typeof sel.sha === 'string' && sel.sha.length === 64, 'sha present');
});
