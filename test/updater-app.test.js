// NEED: GUI — тонкая оболочка, вся логика в тестируемом оркестраторе.
// - checkForUpdate({feedText, gameVersion, currentVersion}): available /
//   up-to-date / no-compatible; битый фид -> throw /feed/.
// - installUpdate({zipPath, entry, unpackDir, storeDir, unpack, keep}):
//   sha не сошлась -> {ok:false}, дальше ни шагу; распаковка/гейт валят ->
//   {ok:false, errors}; успех -> {ok:true, version, shaChecked} + zip в сторе.
// - unpackZip: roundtrip adm-zip (запись -> чтение, байты 1:1).
// Electron в тестах не участвует (flow.js его не импортирует).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { checkForUpdate, installUpdate } from '../updater/lib/flow.js';
import { unpackZip } from '../updater/lib/unzip.js';
import { pack } from '../tools/pack-ru.mjs';

const mk = () => mkdtempSync(join(tmpdir(), 'ruapp-'));
const FEED = JSON.stringify({
  packs: [
    { locale: 'ru', version: '1.2.0', gameMin: '7506', gameMax: '7553', files: [], url: 'https://example.invalid/a.zip', sha: 's' },
    { locale: 'ru', version: '1.3.0', gameMin: '7506', gameMax: '7553', files: [], url: 'https://example.invalid/b.zip', sha: 's' },
  ],
});

test('checkForUpdate: available, up-to-date, no-compatible', () => {
  const avail = checkForUpdate({ feedText: FEED, gameVersion: '7553', currentVersion: '1.2.0' });
  assert.equal(avail.status, 'available');
  assert.equal(avail.entry.version, '1.3.0');
  const same = checkForUpdate({ feedText: FEED, gameVersion: '7553', currentVersion: '1.3.0' });
  assert.equal(same.status, 'up-to-date');
  const none = checkForUpdate({ feedText: FEED, gameVersion: '0000', currentVersion: '1.0.0' });
  assert.equal(none.status, 'no-compatible');
  assert.throws(() => checkForUpdate({ feedText: 'not json', gameVersion: '7553' }), /feed/);
});

test('installUpdate: bad sha stops before unpack', () => {
  const dir = mk();
  const zipPath = join(dir, 'p.zip');
  writeFileSync(zipPath, 'bytes');
  let unpacked = false;
  const rep = installUpdate({
    zipPath,
    entry: { version: '1.3.0', game: '7553', url: 'https://example.invalid/b.zip', sha: 'deadbeef' },
    unpackDir: join(dir, 'out'),
    storeDir: join(dir, 'store'),
    unpack: () => { unpacked = true; return { ok: true }; },
  });
  assert.equal(rep.ok, false);
  assert.equal(unpacked, false);
  assert.ok(rep.reason.includes('sha'), rep.reason);
});

test('installUpdate: skips sha for legacy entries, installs healthy pack', () => {
  const dir = mk();
  const packDir = join(dir, 'pack');
  pack({ out: packDir, version: '1.3.0', game: '7553' });
  const zipPath = join(dir, 'p.zip');
  writeFileSync(zipPath, 'zip-bytes');
  const rep = installUpdate({
    zipPath,
    entry: { version: '1.3.0', game: '7553', url: 'https://example.invalid/b.zip' },
    unpackDir: packDir,
    storeDir: join(dir, 'store'),
    unpack: () => ({ ok: true }),
  });
  assert.equal(rep.ok, true);
  assert.equal(rep.shaChecked, false);
  assert.equal(rep.version, '1.3.0');
});

test('installUpdate: broken unpacked pack refuses loudly', () => {
  const dir = mk();
  const packDir = join(dir, 'pack');
  pack({ out: packDir, version: '1.0.0' });
  writeFileSync(join(packDir, 'ru.json'), 'not json{');
  const zipPath = join(dir, 'p.zip');
  writeFileSync(zipPath, 'zip-bytes');
  const rep = installUpdate({
    zipPath,
    entry: { version: '1.0.0', game: '7553', url: 'https://example.invalid/a.zip' },
    unpackDir: packDir,
    storeDir: join(dir, 'store'),
    unpack: () => ({ ok: true }),
  });
  assert.equal(rep.ok, false);
  assert.ok(rep.errors.length > 0, 'loud refusal');
});

test('unpackZip roundtrips bytes', async () => {
  const { default: AdmZip } = await import('../updater/node_modules/adm-zip/adm-zip.js');
  const dir = mk();
  const zipPath = join(dir, 'a.zip');
  const zip = new AdmZip();
  zip.addFile('hello.txt', Buffer.from('привет', 'utf8'));
  zip.writeZip(zipPath);
  const out = join(dir, 'out');
  const rep = unpackZip(zipPath, out);
  assert.equal(rep.ok, true);
  assert.equal(readFileSync(join(out, 'hello.txt'), 'utf8'), 'привет');
});

test('renderer is self-contained and phone-home free', () => {
  const html = readFileSync(new URL('../updater/renderer/index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('Проверить обновления'), 'main action present');
  assert.ok(html.includes('Откатить'), 'rollback present');
  assert.ok(html.includes('Неофициальный лаунчер русской локализации'), 'unofficial label');
  assert.ok(html.includes('data-open="site"'), 'site link');
  assert.ok(html.includes('data-open="discord"'), 'discord link');
  assert.ok(html.includes('id="auto-check"'), 'auto-check toggle');
  assert.ok(html.includes('id="banner"'), 'version banner');
  assert.ok(html.includes("default-src 'none'"), 'CSP lockdown');
  assert.doesNotMatch(html, /src="https?:/, 'no remote scripts');
  assert.doesNotMatch(html, /href="https?:/, 'no remote links');
});
