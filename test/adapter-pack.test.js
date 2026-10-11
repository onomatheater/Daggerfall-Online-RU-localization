// NEED: клиент подхватывает пак в рантайме, без правки asar.
// - setGameVersion(v) запоминает версию игры; registerPack(pack, game?)
//   проверяет манифест (parse) и совместимость (гейт): чужая версия ->
//   {ok:false, reason}, таблицы не трогаем, клиент живёт на bundled.
// - wrapLiteral/wrapTemplate: ключ есть в паке -> RU из пака; нет ->
//   как раньше через t() (bundled ru -> en -> key + warn).
// - has() в overlay — явная проверка наличия, без сравнения строк.
// Проба на экране остаётся за запуском; здесь — статика в node.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setLocale, setGameVersion, registerPack, wrapLiteral, wrapTemplate } from '../inject/locale-adapter.js';

setLocale('ru');

const PACK = {
  manifest: { locale: 'ru', version: '1.3.0', gameMin: '7506', gameMax: '7553', files: ['ru.json'] },
  tables: { dfo: { packProbeKey: 'Паковая строка %s.' } },
};

test('compatible pack registers and serves RU through wrappers', () => {
  setGameVersion('7553');
  const rep = registerPack(PACK);
  assert.equal(rep.ok, true);
  assert.equal(wrapLiteral('dfo:packProbeKey', { s: 'тест' }), 'Паковая строка тест.');
});

test('incompatible pack refused, client stays on previous pack', () => {
  setGameVersion('7815');
  const rep = registerPack(PACK);
  assert.equal(rep.ok, false);
  assert.ok(typeof rep.reason === 'string' && rep.reason.length > 0, 'reason present');
  assert.equal(wrapLiteral('dfo:packProbeKey', { s: 'тест' }), 'Паковая строка тест.');
});

test('unknown key with no pack falls back to bundled with warn', () => {
  const warns = [];
  const orig = console.warn;
  console.warn = (m) => warns.push(String(m));
  try {
    assert.equal(wrapLiteral('dfo:packMissingKey', {}), 'dfo:packMissingKey');
  } finally {
    console.warn = orig;
  }
  assert.ok(warns.some((w) => w.includes('dfo:packMissingKey')), 'missing key warns');
});

test('wrapTemplate resolves pack values with named params', () => {
  setGameVersion('7524');
  const rep = registerPack({
    manifest: { locale: 'ru', version: '1.0.0', game: '7524', files: [] },
    tables: { strings: { packHello: 'Привет, {name}.' } },
  });
  assert.equal(rep.ok, true);
  assert.equal(wrapTemplate('strings:packHello', { name: 'мир' }), 'Привет, мир.');
});

test('broken manifest never throws, refuses with reason', () => {
  setGameVersion('7553');
  const rep = registerPack({ manifest: { locale: 'ru' }, tables: {} });
  assert.equal(rep.ok, false);
});
