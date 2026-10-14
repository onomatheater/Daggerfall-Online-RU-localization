import test from 'node:test';
import assert from 'node:assert/strict';
import { COVERAGE, RANGES, has } from '../src/font/coverage.js';

test('covers problem glyphs: Кк Ыы Ёё Жж «» — №', () => {
  for (const ch of ['К', 'к', 'Ы', 'ы', 'Ё', 'ё', 'Ж', 'ж', '«', '»', '—', '№']) {
    assert.equal(has(ch.codePointAt(0)), true, ch);
  }
});

test('excludes thin dead weights, covers full cyrillic block', () => {
  for (let cp = 0x0400; cp <= 0x045f; cp++) assert.equal(has(cp), true, 'U+' + cp.toString(16));
  assert.equal(COVERAGE.length, new Set(COVERAGE).size, 'no duplicates');
  assert.deepEqual(RANGES, ['U+0400-045F', 'U+0490-0491', 'U+04B0-04B1', 'U+00AB,U+00BB,U+2014,U+2116']);
});

test('coverage is a frozen sorted contract, stable across imports', async () => {
  assert.ok(Object.isFrozen(COVERAGE), 'frozen');
  const sorted = [...COVERAGE].sort((a, b) => a - b);
  assert.deepEqual(COVERAGE, sorted, 'sorted ascending');
  for (const cp of [0x0401, 0x0451, 0x0491, 0x04b1, 0x00ab, 0x2116]) {
    assert.equal(has(cp), COVERAGE.includes(cp), 'has() agrees with set for U+' + cp.toString(16));
  }
  assert.equal(has(0x0370), false, 'greek block not covered');
  const again = (await import('../src/font/coverage.js')).COVERAGE;
  assert.equal(again, COVERAGE, 'same frozen instance (module-level build runs once)');
});

test('font-face unicode-ranges cover the whole SDF seed (no drift)', async () => {
  const { HANDJET_FACE } = await import('../src/font/handjet.js');
  const face = new Set();
  for (const [, ranges] of HANDJET_FACE.matchAll(/unicode-range:([^;]+);/g)) {
    for (const part of ranges.split(',')) {
      const m = part.trim().match(/^U\+([0-9A-F]+)(?:-([0-9A-F]+))?$/i);
      assert.ok(m, 'parseable range: ' + part);
      const [lo, hi] = [parseInt(m[1], 16), parseInt(m[2] ?? m[1], 16)];
      for (let cp = lo; cp <= hi; cp++) face.add(cp);
    }
  }
  const missing = COVERAGE.filter((cp) => !face.has(cp));
  assert.deepEqual(missing, [], 'SDF seed outside @font-face: ' + missing.map((c) => 'U+' + c.toString(16)).join(','));
});
