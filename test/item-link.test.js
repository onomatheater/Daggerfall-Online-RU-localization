import test from 'node:test';
import assert from 'node:assert/strict';
import { toWire, renderLink } from '../src/net/link.js';

const NAMES = {
  en: { steel_cuirass: 'Steel Cuirass' },
  ru: { steel_cuirass: 'Стальная кираса' },
};

test('wire carries ID only, never display text', () => {
  const wire = toWire({ templateId: 'steel_cuirass' });
  assert.deepEqual(wire, { kind: 'itemLink', templateId: 'steel_cuirass' });
  assert.equal('text' in wire, false);
  assert.equal('name' in wire, false);
});

test('localized text in, error out', () => {
  assert.throws(() => toWire({ templateId: 'steel_cuirass', text: 'Стальная кираса' }), /ID-only/);
  assert.throws(() => toWire({ templateId: 'steel_cuirass', name: 'Steel Cuirass' }), /ID-only/);
});

test('technical fields containing the substrings pass through', () => {
  assert.deepEqual(toWire({ templateId: 'steel_cuirass', filename: 'icon.png' }).templateId, 'steel_cuirass');
  assert.deepEqual(toWire({ templateId: 'steel_cuirass', subtitle: 'x' }).templateId, 'steel_cuirass');
});

test('each side renders in its own locale', () => {
  const wire = toWire({ templateId: 'steel_cuirass' });
  assert.equal(renderLink(wire, 'ru', NAMES), 'Стальная кираса');
  assert.equal(renderLink(wire, 'en', NAMES), 'Steel Cuirass');
});

test('unknown id falls back to templateId, never crashes', () => {
  assert.equal(renderLink(toWire({ templateId: 'nope' }), 'ru', NAMES), 'nope');
});

test('dropped extras and unknown ids warn (nothing silent)', () => {
  const warns = [];
  const orig = console.warn;
  console.warn = (m) => warns.push(String(m));
  try {
    toWire({ templateId: 'steel_cuirass', count: 2 });
    renderLink(toWire({ templateId: 'nope' }), 'ru', NAMES);
  } finally {
    console.warn = orig;
  }
  assert.equal(warns.length, 2);
  assert.match(warns[0], /drops extras/);
  assert.match(warns[1], /unknown id/);
});
