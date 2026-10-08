import test from 'node:test';
import assert from 'node:assert/strict';
import { t, setLocale, getLocale } from '../src/locale/locale.js';

test('fallback EN when RU key missing', () => {
  setLocale('ru');
  assert.equal(t('customName'), 'Custom name: ');
  setLocale('en');
});

test('RU override works', () => {
  setLocale('ru');
  assert.equal(t('youSee'), 'Вы видите %s.');
  setLocale('en');
});

test('unknown locale falls back to en', () => {
  setLocale('xx');
  assert.equal(getLocale(), 'en');
});
