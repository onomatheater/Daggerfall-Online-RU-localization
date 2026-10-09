import test from 'node:test';
import assert from 'node:assert/strict';
import { t, setLocale, getLocale } from '../src/locale/locale.js';

test('fallback: unknown key returns key itself', () => {
  setLocale('ru');
  assert.equal(t('__no_such_key__'), '__no_such_key__');
  setLocale('en');
});

test('default table is strings', () => {
  setLocale('ru');
  assert.match(t('youSee'), /%s/);
  setLocale('en');
});

test('namespaced key reads its own table (no cross-talk)', () => {
  setLocale('ru');
  assert.equal(t('spells:1'), 'Замок Фенрика');
  assert.equal(t('items:1'), 'Изумруд');
  assert.notEqual(t('spells:1'), t('items:1'));
  setLocale('en');
});

test('EN fallback uses Original column value', () => {
  assert.equal(t('spells:1', {}, 'en'), "Fenrik's Door Jam");
});

test('unknown locale falls back to en', () => {
  setLocale('xx');
  assert.equal(getLocale(), 'en');
});
