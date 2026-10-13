// NEED: остатки под нож — main.js разбирается на тестируемые lib-модули.
// paths: file/drive-пути стенда в одном месте (дубль regex из main.js),
// actions: runCheck/runInstall с инжектированными зависимостями —
// битый фид виден как bad-feed, а не маскируется под net-error.
import test from 'node:test';
import assert from 'node:assert/strict';

import { isLocalPath, filePathFromUrl, resolvePickedGameDir, isHttpUrl } from '../updater/lib/paths.js';
import { runCheck, runInstall } from '../updater/lib/actions.js';

test('paths: local stands detected, http is not', () => {
  assert.equal(isLocalPath('file:///tmp/p.zip'), true);
  assert.equal(isLocalPath('C:\\tmp\\p.zip'), true);
  assert.equal(isLocalPath('C:/tmp/p.zip'), true);
  assert.equal(isLocalPath('https://example.invalid/p.zip'), false);
  assert.equal(isLocalPath(''), false);
});

test('paths: file:// strips to fs path', () => {
  assert.equal(filePathFromUrl('file:///tmp/p.zip'), '/tmp/p.zip');
  assert.equal(filePathFromUrl('C:\\tmp\\p.zip'), 'C:\\tmp\\p.zip');
});

test('paths: http detected in one place (no regex triplicates)', () => {
  assert.equal(isHttpUrl('https://example.invalid/feed.json'), true);
  assert.equal(isHttpUrl('http://localhost/feed.json'), true);
  assert.equal(isHttpUrl('file:///tmp/feed.json'), false);
  assert.equal(isHttpUrl('C:\\tmp\\feed.json'), false);
  assert.equal(isHttpUrl(''), false);
});

test('paths: file:// decodes percent-escapes', () => {
  assert.equal(filePathFromUrl('file:///tmp/my%20pack.zip'), '/tmp/my pack.zip');
  assert.equal(filePathFromUrl('file:///tmp/plain.zip'), '/tmp/plain.zip');
});

test('paths: picked folder accepted only with a visible game', () => {
  assert.equal(resolvePickedGameDir(['/game'], () => ({ version: '7553' })), '/game');
  assert.equal(resolvePickedGameDir(['/empty'], () => ({ version: null, reason: 'x' })), null);
  assert.equal(resolvePickedGameDir(['/boom'], () => { throw new Error('io'); }), null);
  assert.equal(resolvePickedGameDir([], () => ({ version: '1' })), null);
  assert.equal(resolvePickedGameDir(null, () => ({ version: '1' })), null);
});

test('flow: ps timeout pinned, feed errors speak Russian', async () => {
  const { PS_TIMEOUT_MS, describeIssue } = await import('../updater/lib/flow.js');
  assert.equal(PS_TIMEOUT_MS, 10000);
  assert.match(describeIssue('feed: not JSON'), /Фид паков испорчен/);
});

test('runCheck: bad feed is bad-feed, not net-error', async () => {
  const bad = await runCheck({
    gameVersion: '7553',
    currentVersion: undefined,
    loadFeed: async () => 'not json{',
  });
  assert.equal(bad.status, 'bad-feed');
  assert.match(bad.reason, /feed/);
  const noPacks = await runCheck({
    gameVersion: '7553',
    currentVersion: undefined,
    loadFeed: async () => '{"packs": {}}',
  });
  assert.equal(noPacks.status, 'bad-feed');
});

test('runCheck: fetch throw is net-error, unknown game short-circuits', async () => {
  const net = await runCheck({
    gameVersion: '7553',
    currentVersion: undefined,
    loadFeed: async () => { throw new Error('boom'); },
  });
  assert.equal(net.status, 'net-error');
  const unknown = await runCheck({ gameVersion: null, gameReason: 'no game', loadFeed: async () => '' });
  assert.equal(unknown.status, 'unknown-game');
  assert.equal(unknown.reason, 'no game');
});

test('runInstall: fetch throw is net-error, unpack reason propagates', async () => {  const { createHash } = await import('node:crypto');
  const { writeFileSync, mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'ruact-'));
  const zipPath = join(dir, 'p.zip');
  writeFileSync(zipPath, 'bytes');
  const sha = createHash('sha256').update('bytes').digest('hex');
  const entry = { version: '1', url: 'https://example.invalid/p.zip', sha };
  const net = await runInstall({
    entry,
    fetchZip: async () => { throw new Error('down'); },
    unpack: () => ({ ok: true }),
    storeDir: join(dir, 's'),
    mkTmp: () => dir,
    rmTmp: () => {},
  });
  assert.equal(net.ok, false);
  assert.equal(net.reason, 'net-error');
});

test('actions: failures are logged, not only returned', async () => {
  const errs = [];
  const orig = console.error;
  console.error = (...a) => errs.push(a.map(String).join(' '));
  try {
    await runCheck({ gameVersion: '7553', currentVersion: undefined, loadFeed: async () => { throw new Error('down'); } });
    await runInstall({
      entry: { version: '1', url: 'https://example.invalid/p.zip', sha: 'a'.repeat(64) },
      fetchZip: async () => { throw new Error('down'); },
      unpack: () => ({ ok: true }),
      storeDir: 's',
      mkTmp: () => 't',
      rmTmp: () => {},
    });
  } finally {
    console.error = orig;
  }
  assert.equal(errs.length, 2);
  assert.match(errs[0], /feed load failed/);
  assert.match(errs[1], /fetchZip failed/);
});
