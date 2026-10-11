// NEED: оверлей-пак переживает апдейт игры.
// - resolve() читает overlay-таблицы рантайма (не статический import),
//   fallback overlay-ru -> bundled-en -> key + warn, подстановки %s/{name}.
// - parseManifest/isCompatible/choosePack гейтят пак по версии игры:
//   чужой/пустой/несовместимый пак 받지, молча не едем.
// Живой апдейтер игры пак не трогает: игра обновляется штатно,
// перевод докачивается отдельным ru-pack.zip (см. tools/pack-ru.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createOverlay, parseManifest, isCompatible, choosePack } from '../src/locale/loader.js';

const EN = { strings: { hello: 'Hello %s.', bye: 'Bye {name}.' } };

test('overlay resolve: ru-hit, en-fallback, key-fallback + warn', () => {
  const ov = createOverlay({ en: EN });
  ov.register('ru', 'strings', { hello: 'Привет %s.' });
  assert.equal(ov.resolve('strings:hello', { s: 'мир' }, 'ru'), 'Привет мир.');
  assert.equal(ov.resolve('strings:bye', { name: 'мир' }, 'ru'), 'Bye мир.');
  const warns = [];
  const orig = console.warn;
  console.warn = (m) => warns.push(String(m));
  try {
    assert.equal(ov.resolve('strings:nope', {}, 'ru'), 'strings:nope');
  } finally {
    console.warn = orig;
  }
  assert.ok(warns.some((w) => w.includes('strings:nope')), 'missing key warns');
});

test('manifest gate: parse + compatible + choose newest', () => {
  const m = parseManifest(JSON.stringify({ locale: 'ru', version: '1.2.0', game: '7553', files: ['ru.json'] }));
  assert.equal(m.locale, 'ru');
  assert.ok(isCompatible(m, '7553'), 'same game compatible');
  assert.ok(!isCompatible(m, '7506'), 'other game rejected');
  assert.throws(() => parseManifest('not json'), /manifest/);
  assert.throws(() => parseManifest(JSON.stringify({ locale: 'ru' })), /manifest/);
  const packs = [
    { version: '1.0.0', game: '7553' },
    { version: '1.2.0', game: '7553' },
    { version: '2.0.0', game: '9999' },
  ];
  assert.equal(choosePack(packs, '7553').version, '1.2.0');
  assert.equal(choosePack(packs, '0000'), null);
});

test('unknown locale falls back to en, never crashes', () => {
  const ov = createOverlay({ en: EN });
  assert.equal(ov.resolve('strings:hello', { s: 'x' }, 'de'), 'Hello x.');
});
