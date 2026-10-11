import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('adapter pins the client-layout import map (probe lesson 7815)', () => {
  const src = readFileSync(new URL('../inject/locale-adapter.js', import.meta.url), 'utf8');
  for (const mod of ['../src/locale/locale.js', '../src/locale/loader.js']) {
    assert.ok(src.includes(`from '${mod}'`), `repo-layout import kept: ${mod}`);
  }
  assert.ok(src.includes(`'../src/locale/locale.js' -> './locale.js'`), 'client map: locale.js');
  assert.ok(src.includes(`'../src/locale/loader.js' -> './loader.js'`), 'client map: loader.js');
});
