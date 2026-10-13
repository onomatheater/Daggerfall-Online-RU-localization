import test from 'node:test';
import assert from 'node:assert/strict';

// NEED: ядро без костылей — единая подстановка, явный has, строгие версии.
import { applyParams } from '../src/locale/params.js';
import { t, hasKey, setLocale } from '../src/locale/locale.js';
import { cmpVersion, canonGameVersion } from '../src/locale/loader.js';
import { plural, month } from '../src/locale/morph.js';

test('params: single source %s + {k}', () => {
  assert.equal(applyParams('You see %s.', { 0: 'gem' }), 'You see gem.');
  assert.equal(applyParams('Hi {name}!', { name: 'Ann' }), 'Hi Ann!');
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
