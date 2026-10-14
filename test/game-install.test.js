// NEED батча В: тихая установка игры + цепочка «игра -> перевод».
// - installArgs: NSIS-флаги тихой установки в ту же папку;
// - runSetup: spawn setup, ждём код выхода (стаб spawn в тесте);
// - runGameUpdate: ассет -> место -> yml -> закачка -> sha -> установка ->
//   детект версии. Отказ на любом шаге — громкий {status, reason}, дерево
//   игры не тронуто до успешного сетапа (ставит сам NSIS).
import test from 'node:test';
import assert from 'node:assert/strict';

import { installArgs, runSetup, runGameUpdate } from '../updater/lib/game-install.js';

const RELEASE = {
  tag_name: 'app-v0.1.8404',
  assets: [
    { name: 'DFO-Online-win-x64-setup.exe', browser_download_url: 'https://dl/dfo/setup.exe', size: 11 },
    { name: 'latest.yml', browser_download_url: 'https://dl/dfo/latest.yml', size: 300 },
  ],
};
const YML = [
  'version: 0.1.8404',
  'files:',
  '  - url: DFO-Online-win-x64-setup.exe',
  '    sha512: PLACEHOLDER',
  '    size: 11',
  '',
].join('\n');

const rig = (over = {}) => {
  const stages = [];
  const written = {};
  return {
    stages,
    written,
    deps: {
      fetchText: async () => YML.replace('PLACEHOLDER', over.sha512 ?? ''),
      fetchFn: async () => ({
        ok: true,
        status: 200,
        headers: { get: () => '11' },
        body: (async function* () { yield Buffer.from('game-setup!'); })(),
      }),
      writeFile: (p, b) => { written[p] = b; },
      freeBytes: () => 1_000_000_000,
      spawn: (exe, args) => {
        assert.ok(exe.endsWith('DFO-Online-win-x64-setup.exe'), exe);
        assert.deepEqual(args.slice(0, 1), ['/S']);
        assert.match(args[1], /^\/D=.+/);
        const handlers = {};
        queueMicrotask(() => (handlers.close ?? (() => {}))(over.code ?? 0));
        return { on: (ev, cb) => { handlers[ev] = cb; } };
      },
      detectVersion: () => ({ version: '0.1.8404' }),
      mkTmp: () => '/tmp/xxxx',
      rmTmp: () => {},
      onStage: (percent, label) => stages.push([percent, label]),
      ...over.deps,
    },
  };
};

test('install flags: silent NSIS into the same folder', () => {
  assert.deepEqual(installArgs('/games/dfo'), ['/S', '/D=/games/dfo']);
});

test('setup: exit code 0 is ok, other codes refuse loudly', async () => {
  const handlers = {};
  const ok = await runSetup({
    exe: '/tmp/s.exe',
    gameDir: '/games/dfo',
    spawn: () => ({ on: (ev, cb) => { handlers[ev] = cb; queueMicrotask(() => handlers.close(0)); } }),
  });
  assert.deepEqual(ok, { ok: true, code: 0 });
  const handlers2 = {};
  const bad = await runSetup({
    exe: '/tmp/s.exe',
    gameDir: '/games/dfo',
    spawn: () => ({ on: (ev, cb) => { handlers2[ev] = cb; queueMicrotask(() => handlers2.close(1603)); } }),
  });
  assert.equal(bad.ok, false);
  assert.match(bad.reason, /1603/);
});

test('full chain: asset -> yml -> download -> sha -> setup -> version', async () => {
  const { createHash } = await import('node:crypto');
  const sha512 = createHash('sha512').update('game-setup!').digest('base64');
  const { stages, written, deps } = rig({ sha512 });
  const { runGameUpdate } = await import('../updater/lib/game-install.js');
  const rep = await runGameUpdate({
    releaseJson: RELEASE,
    platform: 'win32',
    gameDir: '/games/dfo',
    running: false,
    ...deps,
  });
  assert.deepEqual(rep, { status: 'game-updated', version: '0.1.8404' });
  assert.ok(Object.keys(written).length === 1, 'setup bytes staged exactly once');
  const pcts = stages.map((s) => s[0]);
  assert.ok(pcts.length > 0 && pcts.every((p, i) => i === 0 || p >= pcts[i - 1]), 'progress monotonic');
  assert.ok(stages.some((s) => /Качаю/.test(s[1])), 'download stage announced');
});

test('chain refuses: running game, no space, bad sha, setup code, version drift', async () => {
  const { createHash } = await import('node:crypto');
  const sha512 = createHash('sha512').update('game-setup!').digest('base64');
  const { runGameUpdate } = await import('../updater/lib/game-install.js');
  const base = rig({ sha512 }).deps;
  const busy = await runGameUpdate({ releaseJson: RELEASE, platform: 'win32', gameDir: '/g', running: true, ...base });
  assert.equal(busy.status, 'game-busy');
  const poor = await runGameUpdate({
    releaseJson: RELEASE, platform: 'win32', gameDir: '/g', running: false,
    ...base, freeBytes: () => 1,
  });
  assert.equal(poor.status, 'game-install-failed');
  assert.match(poor.reason, /no disk space/);
  const evil = await runGameUpdate({
    releaseJson: RELEASE, platform: 'win32', gameDir: '/g', running: false,
    ...base, fetchText: async () => YML.replace('PLACEHOLDER', createHash('sha512').update('evil').digest('base64')),
  });
  assert.equal(evil.status, 'game-install-failed');
  assert.match(evil.reason, /sha mismatch/);
  const code = await runGameUpdate({
    releaseJson: RELEASE, platform: 'win32', gameDir: '/g', running: false,
    ...base, spawn: () => ({ on: (ev, cb) => { if (ev === 'close') queueMicrotask(() => cb(1)); } }),
  });
  assert.equal(code.status, 'game-install-failed');
  assert.match(code.reason, /code 1/);
  const drift = await runGameUpdate({
    releaseJson: RELEASE, platform: 'win32', gameDir: '/g', running: false,
    ...base, detectVersion: () => ({ version: '0.1.0000' }),
  });
  assert.equal(drift.status, 'game-install-failed');
  assert.match(drift.reason, /version mismatch/);
});

test('game reasons speak Russian through describeIssue', async () => {
  const { describeIssue } = await import('../updater/lib/flow.js');
  assert.match(describeIssue('game setup failed: code 1'), /Установщик игры/);
  assert.match(describeIssue('close the game first'), /Закрой игру/);
  assert.match(describeIssue('game version mismatch: want 0.1.8404, have 0.1.0000'), /Версия не сошлась/);
});

test('latest release is the first list entry, garbage is null', async () => {
  const { latestRelease, diskFreeBytes } = await import('../updater/lib/game-install.js');
  assert.deepEqual(latestRelease(JSON.stringify([{ tag_name: 'app-v1' }, { tag_name: 'app-v0' }])), { tag_name: 'app-v1' });
  assert.equal(latestRelease('[]'), null);
  assert.equal(latestRelease('garbage{{'), null);
  const { tmpdir } = await import('node:os');
  assert.ok(diskFreeBytes(tmpdir()) > 0, 'tmp has free space');
  assert.equal(diskFreeBytes('/no/such/dir-zzz'), null);
});
