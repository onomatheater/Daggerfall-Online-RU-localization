import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { HANDJET_FACE, HANDJET_STACK, HANDJET_FILES } from '../src/font/handjet.js';

test('handjet face covers cyrillic, no thin weights', () => {
  assert.match(HANDJET_FACE, /U\+0400-045F/);
  assert.match(HANDJET_FACE, /font-weight:400/);
  assert.match(HANDJET_STACK, /Handjet/);
  assert.doesNotMatch(HANDJET_FACE, /font-weight:100|font-weight:200|font-weight:300/);
});

test('vendored woff2 files exist on disk', () => {
  for (const f of HANDJET_FILES) assert.equal(existsSync(new URL(`../vendor/handjet/${f}`, import.meta.url)), true, f);
});

test('OFL license vendored', () => {
  const ofl = readFileSync(new URL('../vendor/handjet/OFL.txt', import.meta.url), 'utf8');
  assert.match(ofl, /SIL OPEN FONT LICENSE/i);
});
