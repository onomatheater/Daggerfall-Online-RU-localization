// NEED: склейка конвейера поверх готовых инструментов.
// - bundleHasMarkers(distDir, markers): каждый маркер встречается в .js/.html
//   собранного dist (иначе wiring не доехал до бандла).
// - runPipeline(venue, {dryRun, sh}): шаги clone -> deps -> vanilla-build ->
//   rebase-apply -> patched-build -> markers -> stage. Дефолт dry-run:
//   только список шагов, fs и sh не трогает. Публикации здесь нет (таск 4).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleHasMarkers, STEPS, runPipeline, copyAssets, scrubAssets, defaultSh } from '../tools/publish-pack.mjs';

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
  assert.equal(rep.fonts, 13);
  assert.ok(existsSync(join(probe, 'src', 'locale', 'ru.json')), 'tables copied');
  assert.ok(existsSync(join(probe, 'public', 'fonts', 'Handjet-full.ttf')), 'ttf copied');
  assert.ok(existsSync(join(probe, 'public', 'fonts', 'guildenstern.ttf')), 'renamed ttf copied');
  assert.ok(readFileSync(join(probe, 'src', 'locale', 'locale.js'), 'utf8').includes('export function tOr'), 'tOr shim appended');
  assert.equal(
    readFileSync(join(probe, 'src', 'locale', 'locale.js'), 'utf8').split('PROBE ONLY').length - 1, 1,
    'shim idempotent',
  );
  copyAssets(repoRoot, probe);
  assert.equal(
    readFileSync(join(probe, 'src', 'locale', 'locale.js'), 'utf8').split('PROBE ONLY').length - 1, 1,
    'second copy keeps single shim',
  );
  const thin = mk();
  mkdirSync(join(thin, 'src', 'locale'), { recursive: true });
  writeFileSync(join(thin, 'src', 'locale', 'x.json'), '{}');
  assert.throws(() => copyAssets(thin, mk()), /missing assets/);
});

test('scrubAssets removes only pipeline-owned artifacts', () => {
  const probe = mk();
  mkdirSync(join(probe, 'src', 'locale'), { recursive: true });
  writeFileSync(join(probe, 'src', 'locale', 'ru.json'), '{}');
  mkdirSync(join(probe, 'public', 'fonts'), { recursive: true });
  writeFileSync(join(probe, 'public', 'fonts', 'Handjet-full.ttf'), 'x');
  writeFileSync(join(probe, 'public', 'fonts', 'stranger.ttf'), 'keep me');
  writeFileSync(join(probe, 'precious.txt'), 'keep me');
  assert.equal(scrubAssets(probe).ok, true);
  assert.equal(existsSync(join(probe, 'src', 'locale')), false);
  assert.equal(existsSync(join(probe, 'public', 'fonts', 'Handjet-full.ttf')), false);
  assert.equal(readFileSync(join(probe, 'public', 'fonts', 'stranger.ttf'), 'utf8'), 'keep me');
  assert.equal(readFileSync(join(probe, 'precious.txt'), 'utf8'), 'keep me');
});

test('defaultSh quotes spaced paths on win', () => {
  const spaced = join(mk(), 'dir with space');
  mkdirSync(spaced, { recursive: true });
  const rep = defaultSh({ cmd: 'node', args: ['--version'], cwd: spaced });
  assert.equal(rep.ok, true);
  assert.ok(rep.output.includes('v'), rep.output);
});
