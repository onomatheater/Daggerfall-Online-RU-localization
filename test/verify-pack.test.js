import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { verifyPack } from '../tools/verify-pack.mjs';

test('healthy pack passes all gates', () => {
  const out = mkdtempSync(join(tmpdir(), 'rupack-'));
  execFileSync('node', ['tools/pack-ru.mjs', '--out', out, '--version', '9.9-test'], { cwd: new URL('..', import.meta.url) });
  const rep = verifyPack(out);
  assert.deepEqual(rep.errors, [], JSON.stringify(rep.errors.slice(0, 3)));
  assert.ok(rep.stats.tables >= 7, 'tables counted');
  assert.ok(rep.stats.quests >= 200, 'quests counted, got ' + rep.stats.quests);
  assert.ok(rep.stats.ruKeys > 2000, 'ru keys counted');
});

test('broken pack fails loudly: bad JSON, BOM, stray QBN', () => {
  const out = mkdtempSync(join(tmpdir(), 'rupack-bad-'));
  execFileSync('node', ['tools/pack-ru.mjs', '--out', out, '--version', '9.9-test'], { cwd: new URL('..', import.meta.url) });
  writeFileSync(join(out, 'quests', 'X-LOC.txt'), 'QRC:\nMessage: 1\n<ce> Текст\nQBN:\nClock\n');
  const manifest = JSON.parse(readFileSync(join(out, 'locale-version.json'), 'utf8'));
  manifest.files.push('quests/X-LOC.txt');
  writeFileSync(join(out, 'locale-version.json'), JSON.stringify(manifest));
  const rep = verifyPack(out);
  assert.ok(rep.errors.some((e) => e.includes('X-LOC.txt')), JSON.stringify(rep.errors));
});
