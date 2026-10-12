// NEED: скачанный zip проверяется по sha из фида до установки.
// - buildFeed проносит sha записи в фид (опционально, legacy без sha живёт).
// - selectPack возвращает запись вместе с sha.
// - verifyFileSha(path, expected) считает sha256 файла: совпало -> {ok:true},
//   иначе {ok:false, reason}; файла нет -> {ok:false}, не throw.
//   Причина: подменённый/битый zip не должен доходить до installPack.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { buildFeed, selectPack } from '../tools/feed-ru.mjs';
import { verifyFileSha } from '../tools/update-ru.mjs';

const shaOf = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

test('feed carries sha through selectPack', () => {
  const feed = buildFeed([
    { manifest: { locale: 'ru', version: '1.0.0', game: '7553', files: [] }, url: 'https://example.invalid/a.zip', sha: 'abc123' },
    { manifest: { locale: 'ru', version: '1.1.0', game: '7553', files: [] }, url: 'https://example.invalid/b.zip' },
  ]);
  const sel = selectPack(JSON.stringify(feed), '7553');
  assert.equal(sel.version, '1.1.0');
  assert.equal(sel.sha, undefined, 'sha stays optional for legacy entries');
  const selOld = selectPack(JSON.stringify(buildFeed([
    { manifest: { locale: 'ru', version: '1.0.0', game: '7553', files: [] }, url: 'https://example.invalid/a.zip', sha: 'abc123' },
  ])), '7553');
  assert.equal(selOld.sha, 'abc123');
});

test('verifyFileSha matches, rejects tamper and missing file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rusha-'));
  const path = join(dir, 'ru-pack.zip');
  writeFileSync(path, 'pack-bytes');
  const good = verifyFileSha(path, shaOf('pack-bytes'));
  assert.equal(good.ok, true);
  const tampered = verifyFileSha(path, shaOf('other-bytes'));
  assert.equal(tampered.ok, false);
  assert.ok(tampered.reason.length > 0, 'reason present');
  const missing = verifyFileSha(join(dir, 'nope.zip'), shaOf('pack-bytes'));
  assert.equal(missing.ok, false);
});
