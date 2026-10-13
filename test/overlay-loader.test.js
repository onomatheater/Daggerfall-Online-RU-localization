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

test('range gate: gameMin/gameMax inclusive, invalid range rejected', () => {
  const ranged = { locale: 'ru', version: '1.3.0', gameMin: '7506', gameMax: '7553', files: [] };
  assert.ok(isCompatible(ranged, '7506'), 'min boundary');
  assert.ok(isCompatible(ranged, '7553'), 'max boundary');
  assert.ok(isCompatible(ranged, '7524'), 'inside range');
  assert.ok(!isCompatible(ranged, '7505'), 'below range');
  assert.ok(!isCompatible(ranged, '7815'), 'above range');
  assert.ok(!isCompatible({ locale: 'ru', version: '1.0', gameMin: '7553', gameMax: '7506', files: [] }, '7524'), 'inverted range never compatible');
  assert.ok(!isCompatible({ locale: 'ru', version: '1.0', files: [] }, '7553'), 'no game claim never compatible');
  assert.ok(isCompatible({ locale: 'ru', version: '1.0', gameMin: '0.1.7506', gameMax: '0.1.7553', files: [] }, '0.1.7524'), 'dotted tags compare');
});

test('open range: gameMin-only installs on newer, gameMax-only on older', () => {
  const floor = { locale: 'ru', version: '1.4.0', gameMin: '8127', files: [] };
  assert.ok(isCompatible(floor, '8127'), 'floor itself');
  assert.ok(isCompatible(floor, '0.1.8404'), 'newer game installs (new keys fall back to EN)');
  assert.ok(isCompatible(floor, '0.1.9999'), 'far future installs (no ceiling by design)');
  assert.ok(!isCompatible(floor, '7553'), 'older game rejected (keys may not exist)');
  const cap = { locale: 'ru', version: '1.4.0', gameMax: '8127', files: [] };
  assert.ok(isCompatible(cap, '7553'), 'older installs under cap');
  assert.ok(!isCompatible(cap, '0.1.8404'), 'newer rejected under cap');
});

test('splitKey is single-sourced with locale.js', async () => {
  const locale = await import('../src/locale/locale.js');
  const loader = await import('../src/locale/loader.js');
  assert.equal(loader.splitKey, locale.splitKey, 'no forked copy');
});

test('unknown locale falls back to en, never crashes', () => {
  const ov = createOverlay({ en: EN });
  assert.equal(ov.resolve('strings:hello', { s: 'x' }, 'de'), 'Hello x.');
});

test('cmpVersion compares dotted and short tags numerically', async () => {
  const { cmpVersion } = await import('../src/locale/loader.js');
  assert.ok(cmpVersion('7506', '7553') < 0);
  assert.equal(cmpVersion('7553', '7553'), 0);
  assert.ok(cmpVersion('7815', '7553') > 0);
  assert.ok(cmpVersion('0.1.7506', '0.1.7553') < 0);
});

test('has() reports overlay presence without fallback', async () => {
  const { createOverlay } = await import('../src/locale/loader.js');
  const ov = createOverlay({ en: EN });
  ov.register('ru', 'strings', { hello: 'Привет.' });
  assert.equal(ov.has('strings:hello', 'ru'), true);
  assert.equal(ov.has('strings:bye', 'ru'), false);
  assert.equal(ov.has('strings:hello', 'de'), false);
});

test('version canon: dotted game matches short pack claims', async () => {
  const { isCompatible, choosePack } = await import('../src/locale/loader.js');
  assert.ok(isCompatible({ locale: 'ru', version: '1.0', game: '7553', files: [] }, '0.1.7553'), 'exact across formats');
  assert.ok(
    isCompatible({ locale: 'ru', version: '1.0', gameMin: '7506', gameMax: '7553', files: [] }, '0.1.7524'),
    'range across formats',
  );
  assert.ok(!isCompatible({ locale: 'ru', version: '1.0', game: '7553', files: [] }, '0.1.7506'), 'other build rejected');
  assert.ok(isCompatible({ locale: 'ru', version: '1.0', game: '7553', files: [] }, '7553'), 'short still works');
  const packs = [
    { version: '1.0.0', game: '7506' },
    { version: '1.2.0', gameMin: '7506', gameMax: '7553' },
  ];
  assert.equal(choosePack(packs, '0.1.7553').version, '1.2.0');
});
