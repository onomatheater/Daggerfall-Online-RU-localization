// NEED: ванильный dist версии игры без NSIS/7z — сборкой тега из исходников.
// - distReady(distDir): index.html + assets/ на месте.
// - buildVanilla({cloneDir, outDir, run}): run() собирает клон (дефолт —
//   `npm run build` в cloneDir, инжектится в тестах); итог копируется
//   в outDir; провал — throw, недокопии не остаётся.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { distReady, buildVanilla, defaultRun } from '../tools/vanilla-dist.mjs';

const mk = () => mkdtempSync(join(tmpdir(), 'ruvan-'));
function dist(root, { html = true, assets = true } = {}) {
  if (html) writeFileSync(join(root, 'index.html'), '<a/>');
  if (assets) {
    mkdirSync(join(root, 'assets'), { recursive: true });
    writeFileSync(join(root, 'assets', 'a.js'), 'AAA');
  }
}

test('distReady gates on index.html plus assets dir', () => {
  const ok = mk();
  mkdirSync(ok, { recursive: true });
  dist(ok);
  assert.equal(distReady(ok), true);
  const noHtml = mk();
  mkdirSync(noHtml, { recursive: true });
  dist(noHtml, { html: false });
  assert.equal(distReady(noHtml), false);
  assert.equal(distReady(join(mk(), 'nope')), false);
});

test('buildVanilla copies built dist, cleans up on failure', async () => {
  const clone = mk();
  const good = async ({ cwd, args } = {}) => {
    assert.equal(cwd, clone);
    assert.deepEqual(args, ['run', 'build']);
    mkdirSync(join(clone, 'dist'), { recursive: true });
    dist(join(clone, 'dist'));
    return { ok: true };
  };
  const out = join(mk(), 'vanilla');
  const rep = await buildVanilla({ cloneDir: clone, outDir: out, run: good });
  assert.equal(rep.ok, true);
  assert.equal(distReady(out), true);

  const badClone = mk();
  const bad = async () => ({ ok: false, reason: 'vite blew up' });
  const badOut = join(mk(), 'vanilla');
  await assert.rejects(buildVanilla({ cloneDir: badClone, outDir: badOut, run: bad }), /vanilla-dist/);
  assert.equal(existsSync(badOut), false, 'no half-copy left behind');
});

test('defaultRun resolves commands through the platform shell', () => {
  const rep = defaultRun({ cmd: 'node', args: ['--version'], cwd: tmpdir() });
  assert.equal(rep.ok, true);
});
