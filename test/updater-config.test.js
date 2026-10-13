// NEED: остатки-5 — префы не теряются молча, константы в одном месте.
// - loadPrefs: битый prefs.json сдвигается в бэкап, возвращается дефолт;
// - config: один источник URL/размеров/лимитов/имён exe/префиксов tmp.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  FEED_PACKS_BASE, DEFAULT_FEED_URL, GAME_RELEASES_PAGE,
  GAME_API_LATEST, GAME_API_LIST, LINKS, WINDOW, WINDOW_CHROME, ICON_FILE,
  NEWS, EXE_NAMES, TMP_PREFIXES, PS_TIMEOUT_MS, defaultGameDir,
  RECIPE, PACK, APP_DIST,
} from '../updater/lib/config.js';

test('config: single source pinned', () => {
  assert.equal(FEED_PACKS_BASE, 'https://raw.githubusercontent.com/onomatheater/Daggerfall-Online-RU-localization/main/packs');
  assert.equal(DEFAULT_FEED_URL, `${FEED_PACKS_BASE}/feed.json`);
  assert.equal(GAME_RELEASES_PAGE, 'https://github.com/Lattymoy/daggerfall-js-source/releases/latest');
  assert.equal(GAME_API_LATEST, 'https://api.github.com/repos/Lattymoy/daggerfall-js-source/releases/latest');
  assert.equal(GAME_API_LIST, 'https://api.github.com/repos/Lattymoy/daggerfall-js-source/releases?per_page=5');
  assert.deepEqual(LINKS, { site: 'https://daggerfalljs.dev/', discord: 'https://discord.gg/jM2JdwSM8w' });
  assert.deepEqual(WINDOW, { width: 960, height: 600 });
  assert.deepEqual(NEWS, { perPage: 5, bodyMax: 2000, dateLen: 10 });
  assert.deepEqual(EXE_NAMES, ['DFO Online.exe', 'DFO Online/DFO Online.exe', 'Daggerfall Online.exe']);
  assert.deepEqual(TMP_PREFIXES, ['ruapp-', 'rurecipe-']);
  assert.equal(PS_TIMEOUT_MS, 10000);
});

test('config: default game dir without LOCALAPPDATA is empty, not broken', () => {
  assert.equal(defaultGameDir({ LOCALAPPDATA: 'C:\\Users\\x\\AppData\\Local' }), 'C:\\Users\\x\\AppData\\Local\\Programs\\Daggerfall Online');
  assert.equal(defaultGameDir({}), '');
});

test('config: window chrome, recipe/pack layout pinned', () => {
  assert.deepEqual(WINDOW_CHROME, {
    resizable: false,
    maximizable: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0c11',
    title: 'Обновление перевода',
  });
  assert.equal(ICON_FILE, 'assets/icon.ico');
  assert.deepEqual(RECIPE, { zip: 'recipe.zip', dir: 'recipe', file: 'recipe.json' });
  assert.deepEqual(PACK, { zip: 'ru-pack.zip', dir: 'pack' });
  assert.deepEqual(APP_DIST, ['resources', 'app', 'dist']);
});

test('config: restore progress stages pinned (single scale)', async () => {
  const { PROGRESS } = await import('../updater/lib/config.js');
  assert.deepEqual(PROGRESS, { start: 5, prepare: 20, fetch: 50, apply: 75 });
});

test('prefs: corrupt file is backed up, default returned', async () => {
  const { loadPrefs, DEFAULT_PREFS } = await import('../updater/lib/prefs.js');
  const dir = mkdtempSync(join(tmpdir(), 'ruprefs-'));
  writeFileSync(join(dir, 'prefs.json'), 'not json{');
  const got = loadPrefs(dir);
  assert.deepEqual(got, DEFAULT_PREFS);
  const names = readdirSync(dir).filter((n) => n.startsWith('prefs.corrupt-') && n.endsWith('.bak'));
  assert.equal(names.length, 1);
  assert.equal(readFileSync(join(dir, names[0]), 'utf8'), 'not json{');
});

test('prefs: missing file stays missing (no backup of nothing)', async () => {
  const { loadPrefs, DEFAULT_PREFS } = await import('../updater/lib/prefs.js');
  const dir = mkdtempSync(join(tmpdir(), 'ruprefs-'));
  assert.deepEqual(loadPrefs(dir), DEFAULT_PREFS);
  assert.deepEqual(readdirSync(dir), []);
});
