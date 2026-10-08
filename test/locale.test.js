import test from 'node:test';
import assert from 'node:assert/strict';
import { t, setLocale, getLocale } from '../src/locale/locale.js';

test('fallback EN when RU key missing', () => {
  setLocale('ru');
  assert.equal(t('__no_such_key__'), '__no_such_key__');
  setLocale('en');
});

test('RU override works (Jagget value, macro intact)', () => {
  setLocale('ru');
  assert.equal(t('youSee'), 'Это %s.');
  assert.match(t('youSee'), /%s/);
  setLocale('en');
});

test('unknown locale falls back to en', () => {
  setLocale('xx');
  assert.equal(getLocale(), 'en');
});
