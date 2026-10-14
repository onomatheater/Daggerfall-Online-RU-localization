// NEED: браузерный загрузчик внешнего пака (игра читает Prefs/Locale/ru/).
// - loadExternalPackFetch({baseUrl, gameVersion, bundled, fetchJson}): два fetch
//   (locale-version.json + ru.json), гейт parseManifest/isCompatible, регистрация
//   таблиц в overlay. fetchJson инжектится (тест — стаб, игра — fetch).
// - Отказ — {ok:false, reason}, никогда throw: игра живёт дальше на bundled EN.
// - registerPack({manifest, tables}) в inject/locale-adapter.js уже принимает
//   ровно эту форму — загрузчик и адаптер стыкуются без новых API.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadExternalPackFetch } from '../src/locale/loader.js';

const EN = { strings: { hello: 'Hello %s.', bye: 'Bye.' } };
const MANIFEST = { locale: 'ru', version: '1.0.0', game: '7553', files: ['ru.json'] };
const TABLES = { strings: { hello: 'Привет %s.' } };

const stubFetch = ({ manifest = MANIFEST, tables = TABLES, failOn = null } = {}) => async (url) => {
  if (failOn !== null && url.endsWith(failOn)) throw new Error('net down');
  if (url.endsWith('locale-version.json')) return manifest;
  if (url.endsWith('ru.json')) return tables;
  throw new Error(`unexpected url: ${url}`);
};

test('fetch failure returns {ok:false}, never throws', async () => {
  const hit = await loadExternalPackFetch({
    baseUrl: 'Prefs/Locale/ru', gameVersion: '7553', bundled: { en: EN },
    fetchJson: stubFetch({ failOn: 'locale-version.json' }),
  });
  assert.equal(hit.ok, false);
  assert.ok(typeof hit.reason === 'string' && hit.reason.length > 0, 'reason explains');
});

test('incompatible game version returns {ok:false}', async () => {
  const hit = await loadExternalPackFetch({
    baseUrl: 'Prefs/Locale/ru', gameVersion: '7506', bundled: { en: EN },
    fetchJson: stubFetch(),
  });
  assert.equal(hit.ok, false);
  assert.match(String(hit.reason), /incompatible/i);
});

test('bad manifest and bad tables return {ok:false}', async () => {
  const noManifest = await loadExternalPackFetch({
    baseUrl: 'x', gameVersion: '7553', bundled: { en: EN },
    fetchJson: stubFetch({ manifest: { locale: 'ru' } }),
  });
  assert.equal(noManifest.ok, false);
  const noTables = await loadExternalPackFetch({
    baseUrl: 'x', gameVersion: '7553', bundled: { en: EN },
    fetchJson: stubFetch({ tables: [1, 2] }),
  });
  assert.equal(noTables.ok, false);
});

test('valid pack registers overlay: RU hit, EN fallback, has()', async () => {
  const hit = await loadExternalPackFetch({
    baseUrl: 'Prefs/Locale/ru', gameVersion: '0.1.7553', bundled: { en: EN },
    fetchJson: stubFetch(),
  });
  assert.equal(hit.ok, true);
  assert.equal(hit.overlay.resolve('strings:hello', { s: 'мир' }, 'ru'), 'Привет мир.');
  assert.equal(hit.overlay.resolve('strings:bye', {}, 'ru'), 'Bye.');
  assert.ok(hit.overlay.has('strings:hello', 'ru'), 'presence reported');
  assert.deepEqual(Object.keys(hit.tables), ['strings']);
});
