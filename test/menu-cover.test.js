import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { coverReport, SKIP_STRINGS, MENU_SCOPE } from '../tools/menu-cover.mjs';

function fixtureDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'menucover-'));
  fs.mkdirSync(path.join(dir, 'ui'), { recursive: true });
  for (const f of MENU_SCOPE) {
    const name = f.slice('ui/'.length);
    fs.writeFileSync(path.join(dir, 'ui', name), files[name] ?? '// empty scope stub\n');
  }
  return dir;
}

test('menu-cover: skip-set pins the review verdicts', () => {
  assert.ok(SKIP_STRINGS.has('key bindings keys keyboard rebind controls'));
  assert.ok(SKIP_STRINGS.has('Modules.'));
  assert.equal(SKIP_STRINGS.size, 8);
  assert.ok(MENU_SCOPE.includes('ui/enhancedMenu.js'));
  assert.ok(MENU_SCOPE.includes('ui/shotsPane.js'));
});

test('menu-cover: detects an uncovered display string', () => {
  const dir = fixtureDir({
    'enhancedMenu.js': `el('button', 'act', 'Zzz brand new upstream string');`,
  });
  const misses = coverReport(dir, new Set(['Existing']));
  assert.equal(misses.length, 1);
  assert.equal(misses[0].en, 'Zzz brand new upstream string');
  assert.equal(misses[0].risk, null);
});

test('menu-cover: risk-flagged strings are reported, not silently dropped', () => {
  const dir = fixtureDir({
    // double space trips the template-part risk rule.
    'enhancedMenu.js': `el('button', 'act', 'A picture  doubled');`,
  });
  const misses = coverReport(dir, new Set());
  assert.equal(misses.length, 1);
  assert.equal(misses[0].risk, 'template-part');
});

test('menu-cover: scans every scope file, not just the injected one', () => {
  const dir = fixtureDir({
    'enhancedMenu.js': `el('button', 'act', 'Already covered');`,
    'shotsPane.js': `el('button', 'act', 'Zzz sibling scope string');`,
  });
  const misses = coverReport(dir, new Set(['Already covered']));
  assert.equal(misses.length, 1);
  assert.equal(misses[0].en, 'Zzz sibling scope string');
});

test('menu-cover: covered and skipped strings stay silent', () => {
  const dir = fixtureDir({
    'enhancedMenu.js': [
      `el('button', 'act', 'Already covered');`,
      `if (item === 'bindings') return 'key bindings keys keyboard rebind controls';`,
    ].join('\n'),
  });
  const misses = coverReport(dir, new Set(['Already covered']));
  assert.equal(misses.filter((m) => !m.risk).length, 0);
});
