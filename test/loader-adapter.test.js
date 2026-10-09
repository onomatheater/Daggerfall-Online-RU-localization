import test from 'node:test';
import assert from 'node:assert/strict';
import { wrapLiteral, wrapTemplate, setLocale } from '../inject/locale-adapter.js';

test('wrapLiteral: upstream literal becomes table lookup, EN byte-identical', () => {
  setLocale('en');
  assert.equal(wrapLiteral('strings:youSee', { s: 'rat' }), 'You see rat.');
});

test('wrapLiteral: RU renders translated', () => {
  setLocale('ru');
  assert.equal(wrapLiteral('strings:youSee', { s: 'крыса' }), 'Это крыса.');
  setLocale('en');
});

test('wrapTemplate: `${name} just died.` maps to thingJustDied', () => {
  setLocale('en');
  assert.equal(wrapTemplate('strings:thingJustDied', { s: 'rat' }), "'rat just died.'");
  setLocale('ru');
  assert.equal(wrapTemplate('strings:thingJustDied', { s: 'крыса' }), 'крыса погибает.');
  setLocale('en');
});
