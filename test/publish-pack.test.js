// NEED: склейка конвейера поверх готовых инструментов.
// - bundleHasMarkers(distDir, markers): каждый маркер встречается в .js/.html
//   собранного dist (иначе wiring не доехал до бандла).
// - runPipeline(venue, {dryRun, sh}): шаги clone -> deps -> vanilla-build ->
//   rebase-apply -> patched-build -> markers -> stage. Дефолт dry-run:
//   только список шагов, fs и sh не трогает. Публикации здесь нет (таск 4).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleHasMarkers, STEPS, runPipeline, copyAssets } from '../tools/publish-pack.mjs';

const mk = () => mkdtempSync(join(tmpdir(), 'rupipe-'));

test('bundleHasMarkers finds markers in bundle text', () => {
  const dir = mk();
  mkdirSync(join(dir, 'assets'), { recursive: true });
  writeFileSync(join(dir, 'index.html'), '<a/>');
  writeFileSync(join(dir, 'assets', 'm.js'), 'const x="Пропустить вступление"; // intro.skip');
  assert.equal(bundleHasMarkers(dir, ['Пропустить вступление', 'intro.skip']), true);
  assert.equal(bundleHasMarkers(dir, ['Пропустить вступление', 'nope-never']), false);
});

test('runPipeline dry-run lists steps, touches nothing', async () => {
  const venue = {
    workRoot: join(mk(), 'work'),
    gameTag: 'app-v0.1.8127',
    version: '0.1.8127',
    fromTag: 'app-v0.1.7815',
    scriptsDir: 'C:/tmp/patches',
    queuePath: 'C:/repo/tools/probe-queue.json',
    packVersion: '1.4.0',
    urlBase: 'https://example.invalid/packs',
    vanillaClone: 'C:/tmp/vanilla',
    probeTree: 'C:/tmp/dfjs',
    markers: ['m1'],
    notes: ['n1'],
  };
  const rep = await runPipeline(venue, {
    dryRun: true,
    sh: () => { throw new Error('must not shell in dry-run'); },
  });
  assert.deepEqual(rep.steps, STEPS);
  assert.equal(rep.executed, false);
  assert.equal(existsSync(venue.workRoot), false, 'no fs side effects');
  await assert.rejects(runPipeline({ ...venue, gameTag: '' }, { dryRun: true }), /gameTag/);
});

test('copyAssets lays tables and fonts, refuses on gaps', async () => {
  const probe = mk();
  mkdirSync(join(probe, 'src'), { recursive: true });
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const rep = copyAssets(repoRoot, probe);
  assert.equal(rep.ok, true);
  assert.equal(rep.fonts, 11);
  assert.ok(existsSync(join(probe, 'src', 'locale', 'ru.json')), 'tables copied');
  assert.ok(existsSync(join(probe, 'public', 'fonts', 'Handjet-full.ttf')), 'ttf copied');
  assert.ok(existsSync(join(probe, 'public', 'fonts', 'guildenstern.ttf')), 'renamed ttf copied');
  const thin = mk();
  mkdirSync(join(thin, 'src', 'locale'), { recursive: true });
  writeFileSync(join(thin, 'src', 'locale', 'x.json'), '{}');
  assert.throws(() => copyAssets(thin, mk()), /missing assets/);
});
