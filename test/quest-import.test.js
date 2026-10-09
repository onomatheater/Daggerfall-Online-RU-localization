import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stripQbn, importCorpus } from '../tools/quest-import.mjs';

test('stripQbn cuts logic, keeps QRC', () => {
  const out = stripQbn('QRC:\nMessage: 1\n<ce> Текст\nQBN:\nClock _q_ 1\n');
  assert.match(out, /QRC:/);
  assert.doesNotMatch(out, /QBN:/);
  assert.doesNotMatch(out, /Clock/);
});

test('importCorpus stores stripped files, reports errors per file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'qimp-'));
  const srcDir = join(dir, 'src');
  const locDir = join(dir, 'loc');
  mkdirSync(srcDir);
  mkdirSync(locDir);
  writeFileSync(join(srcDir, 'S.txt'), 'Quest: S\nQRC:\nMessage: 1\n<ce> Hi %pcn.\nQBN:\nClock\n');
  writeFileSync(join(locDir, 'S-LOC.txt'), 'Quest: S\nQRC:\nMessage: 1\n<ce> Привет.\nQBN:\nClock\n');
  const rep = importCorpus({ srcDir, locDir, outDir: join(dir, 'out'), books: false });
  assert.equal(rep.stored, 1);
  const stored = readFileSync(join(dir, 'out', 'S-LOC.txt'), 'utf8');
  assert.doesNotMatch(stored, /QBN:/);
  assert.equal(rep.files[0].errors.length, 2, 'lost %pcn + QBN flagged');
  assert.ok(rep.files[0].errors.some((e) => e.includes('%pcn')));
  assert.ok(rep.files[0].errors.some((e) => e.includes('QBN')));
});
