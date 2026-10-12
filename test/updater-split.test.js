// NEED: раздельные обновления игры и пака + новости из настоящего фида.
// - loadFeedText(source, {fetchText, readText}): http(s) -> fetch,
//   иначе локальный путь (демо/разработка) -> read. Сеть только по кнопке.
// - checkGameUpdate({apiText, currentVersion}): notice-механика разработчиков
//   (их updateCheck.cjs, MIT): available + tag, иначе тихо available:false.
//   Игру никогда не трогаем — только баннер и кнопка на страницу релизов.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadFeedText, checkGameUpdate } from '../updater/lib/flow.js';

test('loadFeedText: http goes to fetch, path goes to disk', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rufeed-'));
  const path = join(dir, 'feed.json');
  writeFileSync(path, '{"packs":[]}');
  const fromDisk = await loadFeedText(path, {
    fetchText: () => { throw new Error('must not fetch'); },
    readText: (p) => { assert.equal(p, path); return '{"packs":[]}'; },
  });
  assert.equal(fromDisk, '{"packs":[]}');
  const fromNet = await loadFeedText('https://example.invalid/feed.json', {
    fetchText: (u) => { assert.ok(u.startsWith('https://')); return Promise.resolve('net-feed'); },
    readText: () => { throw new Error('must not read'); },
  });
  assert.equal(fromNet, 'net-feed');
});

test('checkGameUpdate: newer tag detected, garbage is silence', () => {
  const api = JSON.stringify({ tag_name: 'app-v0.1.8127' });
  const hit = checkGameUpdate({ apiText: api, currentVersion: '0.1.7815' });
  assert.equal(hit.available, true);
  assert.equal(hit.tag, 'app-v0.1.8127');
  const same = checkGameUpdate({ apiText: api, currentVersion: '0.1.8127' });
  assert.equal(same.available, false);
  const garbage = checkGameUpdate({ apiText: 'not json', currentVersion: '0.1.7815' });
  assert.equal(garbage.available, false);
  const siteTag = checkGameUpdate({ apiText: JSON.stringify({ tag_name: 'site-123' }), currentVersion: '0.1.7815' });
  assert.equal(siteTag.available, false);
});

test('resolveGameFile: installer per platform, null when unpackaged', async () => {
  const { resolveGameFile, GAME_RELEASES_PAGE } = await import('../updater/lib/flow.js');
  assert.ok(GAME_RELEASES_PAGE.includes('releases/latest'), 'stable releases page');
  assert.equal(resolveGameFile({ platform: 'win32', packaged: true, portable: false }), 'DaggerfallOnline-win-x64-setup.exe');
  assert.equal(resolveGameFile({ platform: 'win32', packaged: true, portable: true }), 'DaggerfallOnline-win-x64-portable.exe');
  assert.equal(resolveGameFile({ platform: 'darwin', packaged: true, portable: false }), 'DaggerfallOnline-mac-arm64.dmg');
  assert.equal(resolveGameFile({ platform: 'win32', packaged: false, portable: false }), null);
});

test('planGameUpdate: setup runs installer, portable replaces exe, running game blocks', async () => {
  const { planGameUpdate, isGameRunning } = await import('../updater/lib/flow.js');
  assert.deepEqual(
    planGameUpdate({ file: 'DaggerfallOnline-win-x64-setup.exe', gameRunning: false }),
    { kind: 'installer' }
  );
  assert.deepEqual(
    planGameUpdate({ file: 'DaggerfallOnline-win-x64-portable.exe', gameRunning: false }),
    { kind: 'portable-file' }
  );
  assert.deepEqual(
    planGameUpdate({ file: 'DaggerfallOnline-win-x64-portable.exe', gameRunning: true }),
    { blocked: 'close-game' }
  );
  assert.deepEqual(planGameUpdate({ file: null, gameRunning: false }), { blocked: 'no-file' });
  const running = await isGameRunning(async () => '... Daggerfall Online.exe ...');
  assert.equal(running, true);
  const idle = await isGameRunning(async () => 'chrome.exe');
  assert.equal(idle, false);
});
