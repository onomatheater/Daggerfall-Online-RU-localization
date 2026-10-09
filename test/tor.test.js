import test from 'node:test';
import assert from 'node:assert/strict';
import { tOr, setLocale } from '../src/locale/locale.js';

test('tOr returns translation, else the given fallback (no key leak)', () => {
  setLocale('ru');
  assert.equal(tOr('dfo:menu.settings', 'Settings'), 'Настройки');
  assert.equal(tOr('dfo:menu.nope', 'Fallback Label'), 'Fallback Label');
  setLocale('en');
  assert.equal(tOr('dfo:menu.nope', 'Fallback Label'), 'Fallback Label');
});

test('tOr passes params through', () => {
  setLocale('ru');
  assert.equal(tOr('strings:youSee', 'You see %s.', { s: 'крыса' }), 'Это крыса.');
  setLocale('en');
});
