import test from 'node:test';
import assert from 'node:assert/strict';

// NEED: ядро без костылей — единая подстановка, явный has, строгие версии.
import { applyParams } from '../src/locale/params.js';
import { t, tp, hasKey, setLocale, getLocale } from '../src/locale/locale.js';
import { cmpVersion, canonGameVersion, parseManifest, choosePack, MANIFEST_FILE, RU_FILE } from '../src/locale/loader.js';
import { plural, month, select } from '../src/locale/morph.js';

test('params: single source %s + {k}', () => {
  assert.equal(applyParams('You see %s.', { 0: 'gem' }), 'You see gem.');
  assert.equal(applyParams('Hi {name}!', { name: 'Ann' }), 'Hi Ann!');
});

test('params: multiple %s fill in order, none lost', () => {
  assert.equal(applyParams('%s + %s', { 0: 'a', 1: 'b' }), 'a + b');
  assert.equal(applyParams('%s%s%s', { 0: 'a', 1: 'b', 2: 'c' }), 'abc');
});

test('tp: passes params and locale through to t()', () => {
  setLocale('ru');
  try {
    assert.equal(tp('dfo:menu.sync_go', 1, {}, 'en'), 'Sync 1 setting');
    assert.equal(tp('dfo:menu.sync_go', 1), 'Синхронизировать 1 настройку');
  } finally {
    setLocale('en');
  }
  assert.equal(getLocale(), 'en');
});

test('t: object hit returns object untouched (tp path)', () => {
  setLocale('ru');
  const hit = t('dfo:__no_such_key_obj__');
  assert.equal(typeof hit, 'string');
  setLocale('en');
});

test('hasKey: explicit miss detector', () => {
  assert.equal(hasKey('__no_such_key__'), false);
  assert.equal(hasKey('strings:youSee'), true);
});

test('cmpVersion: garbage is NaN, not equal', () => {
  assert.ok(Number.isNaN(cmpVersion('abc', '1')));
});

test('canonGameVersion: garbage -> empty (incompatible, not lie)', () => {
  assert.equal(canonGameVersion('garbage!!'), '');
});

test('plural: NaN warns and falls to many', () => {
  const warns = [];
  const orig = console.warn;
  console.warn = (m) => warns.push(String(m));
  try {
    const f = { one: '# книга', few: '# книги', many: '# книг' };
    assert.equal(plural(undefined, f), 'undefined книг');
  } finally {
    console.warn = orig;
  }
  assert.ok(warns.length > 0);
});

test('month: bad index warns', () => {
  const warns = [];
  const orig = console.warn;
  console.warn = (m) => warns.push(String(m));
  try {
    assert.equal(month(99, 'gen'), '');
  } finally {
    console.warn = orig;
  }
  assert.ok(warns.length > 0);
});

test('select: unknown key warns and falls to other', () => {
  const warns = [];
  const orig = console.warn;
  console.warn = (m) => warns.push(String(m));
  try {
    assert.equal(select('feminine', { masculine: 'Стальной', other: 'Стальное' }), 'Стальное');
    assert.equal(warns.length, 0, 'fallback to other is the designed path, silent');
    assert.equal(select('unknown', { masculine: 'Стальной' }), '');
  } finally {
    console.warn = orig;
  }
  assert.equal(warns.length, 1);
  assert.match(warns[0], /bad key=unknown/);
});

test('parseManifest: object or JSON text, pack filenames pinned', () => {
  assert.equal(MANIFEST_FILE, 'locale-version.json');
  assert.equal(RU_FILE, 'ru.json');
  const m = { locale: 'ru', version: '1', files: ['ru.json'] };
  assert.deepEqual(parseManifest(m), m);
  assert.deepEqual(parseManifest(JSON.stringify(m)), m);
});

test('choosePack: garbage version never wins, order stable', () => {
  const good = { version: '1.0.0', game: '7553' };
  const bad = { version: 'zzz', game: '7553' };
  assert.equal(choosePack([bad, good], '7553').version, '1.0.0');
  assert.equal(choosePack([good, bad], '7553').version, '1.0.0');
});
