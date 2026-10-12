// NEED: апдейтер data-only — проверенный пак в Prefs/Locale/ru (Task 3).
// - installPackToPrefs(packDir, prefsDir): гейт installPack (битый пак — отказ,
//   Prefs не тронут) → копирует ровно manifest.files[] + locale-version.json.
//   Траверс (`..`/абсолют) — отказ до единой записи. Отказ — {ok:false, reason}.
// - resolveGameLocaleDir({platform, env, home}): userData игры (факт апстрима:
//   appData/'Daggerfall JavaScript', переопределение DAGGER_USER_DATA) +
//   'Prefs/Locale/ru'. Параметрами, без чтения окружения внутри (тестируемо).
// - Рецепт-dist (restoreTranslation) — НЕ трогаем: fallback для игр без
//   Prefs-поддержки, отдельная задача после апстрим-PR.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { installPackToPrefs } from '../tools/update-ru.mjs';
import { resolveGameLocaleDir } from '../tools/game-prefs.mjs';
import { installUpdate } from '../updater/lib/flow.js';
import { pack } from '../tools/pack-ru.mjs';
import { createHash } from 'node:crypto';

const REPO = new URL('..', import.meta.url);

function buildPack(version = '9.9.9-prefs-test') {
  const out = mkdtempSync(join(tmpdir(), 'rupack-'));
  execFileSync('node', ['tools/pack-ru.mjs', '--out', out, '--version', version], { cwd: REPO });
  return out;
}

test('valid pack lands in Prefs dir byte-equal', () => {
  const pack = buildPack();
  const prefs = join(mkdtempSync(join(tmpdir(), 'ruprefs-')), 'Prefs', 'Locale', 'ru');
  try {
    const hit = installPackToPrefs(pack, prefs);
    assert.equal(hit.ok, true);
    assert.equal(
      readFileSync(join(prefs, 'ru.json'), 'utf8'),
      readFileSync(join(pack, 'ru.json'), 'utf8'),
      'ru.json byte-equal',
    );
    const manifest = JSON.parse(readFileSync(join(prefs, 'locale-version.json'), 'utf8'));
    assert.equal(manifest.version, '9.9.9-prefs-test');
    for (const f of manifest.files) assert.equal(existsSync(join(prefs, f)), true, f);
  } finally {
    rmSync(pack, { recursive: true, force: true });
  }
});

test('broken pack refuses, Prefs untouched', () => {
  const pack = mkdtempSync(join(tmpdir(), 'rubroken-'));
  const prefsRoot = mkdtempSync(join(tmpdir(), 'ruprefs-'));
  const prefs = join(prefsRoot, 'Prefs', 'Locale', 'ru');
  try {
    const hit = installPackToPrefs(pack, prefs);
    assert.equal(hit.ok, false);
    assert.ok(typeof hit.reason === 'string' && hit.reason.length > 0, 'reason explains');
    assert.equal(existsSync(prefs), false, 'nothing written');
  } finally {
    rmSync(pack, { recursive: true, force: true });
  }
});

test('traversal manifest refuses before any write', () => {
  const pack = buildPack();
  const evil = join(tmpdir(), 'ruprefs-evil.txt');
  writeFileSync(evil, 'evil');
  const manifestPath = join(pack, 'locale-version.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.files = [...manifest.files, '../ruprefs-evil.txt'];
  writeFileSync(manifestPath, JSON.stringify(manifest));
  const prefs = join(mkdtempSync(join(tmpdir(), 'ruprefs-')), 'Prefs', 'Locale', 'ru');
  try {
    const hit = installPackToPrefs(pack, prefs);
    assert.equal(hit.ok, false);
    assert.match(String(hit.reason), /traversal|outside/i);
    assert.equal(existsSync(prefs), false, 'nothing written');
    assert.equal(readFileSync(evil, 'utf8'), 'evil', 'outside file intact');
  } finally {
    rmSync(pack, { recursive: true, force: true });
    rmSync(evil, { force: true });
  }
});

test('installUpdate with prefsDir lays verified pack into Prefs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ruapp-'));
  const unpackDir = join(dir, 'pack');
  pack({ out: unpackDir, version: '9.9.9-flow-test' });
  const zipPath = join(dir, 'p.zip');
  writeFileSync(zipPath, 'zip-bytes');
  const prefs = join(dir, 'Prefs', 'Locale', 'ru');
  const rep = installUpdate({
    zipPath,
    entry: { version: '9.9.9-flow-test', game: '7553', url: 'https://example.invalid/a.zip', sha: createHash('sha256').update('zip-bytes').digest('hex') },
    unpackDir,
    storeDir: join(dir, 'store'),
    unpack: () => ({ ok: true }),
    prefsDir: prefs,
  });
  assert.equal(rep.ok, true);
  assert.equal(
    readFileSync(join(prefs, 'ru.json'), 'utf8'),
    readFileSync(join(unpackDir, 'ru.json'), 'utf8'),
    'ru.json in Prefs byte-equal',
  );
  rmSync(dir, { recursive: true, force: true });
});

test('installUpdate without prefsDir keeps store-only behavior', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ruapp-'));
  const unpackDir = join(dir, 'pack');
  pack({ out: unpackDir, version: '9.9.9-flow-test' });
  const zipPath = join(dir, 'p.zip');
  writeFileSync(zipPath, 'zip-bytes');
  const rep = installUpdate({
    zipPath,
    entry: { version: '9.9.9-flow-test', game: '7553', url: 'https://example.invalid/a.zip', sha: createHash('sha256').update('zip-bytes').digest('hex') },
    unpackDir,
    storeDir: join(dir, 'store'),
    unpack: () => ({ ok: true }),
  });
  assert.equal(rep.ok, true);
  assert.equal(existsSync(join(dir, 'Prefs')), false, 'no Prefs touched');
  rmSync(dir, { recursive: true, force: true });
});
test('resolveGameLocaleDir mirrors game userData + override', () => {
  assert.equal(
    resolveGameLocaleDir({ platform: 'win32', env: { APPDATA: 'C:\\Users\\u\\AppData\\Roaming' }, home: 'C:\\Users\\u' }),
    join('C:\\Users\\u\\AppData\\Roaming', 'Daggerfall JavaScript', 'Prefs', 'Locale', 'ru'),
  );
  assert.equal(
    resolveGameLocaleDir({ platform: 'win32', env: { APPDATA: 'C:\\A', DAGGER_USER_DATA: 'D:\\game-data' }, home: 'C:\\U' }),
    join('D:\\game-data', 'Prefs', 'Locale', 'ru'),
  );
  assert.equal(
    resolveGameLocaleDir({ platform: 'linux', env: {}, home: '/home/u' }),
    join('/home/u', '.config', 'Daggerfall JavaScript', 'Prefs', 'Locale', 'ru'),
  );
});
