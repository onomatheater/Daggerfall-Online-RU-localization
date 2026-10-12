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

test('isGameRunning reads process list, touches nothing', async () => {
  const { isGameRunning } = await import('../updater/lib/flow.js');
  const running = await isGameRunning(async () => '... Daggerfall Online.exe ...');
  assert.equal(running, true);
  const idle = await isGameRunning(async () => 'chrome.exe');
  assert.equal(idle, false);
});

test('isGameRunning matches mac/linux lines, picks list command per platform', async () => {
  const { isGameRunning, psCommand } = await import('../updater/lib/flow.js');
  const mac = await isGameRunning(async () => '1234 /Applications/Daggerfall Online.app/Contents/MacOS/Daggerfall Online');
  assert.equal(mac, true);
  const lin = await isGameRunning(async () => '5678 /opt/games/Daggerfall Online --no-sandbox');
  assert.equal(lin, true);
  assert.deepEqual(psCommand('win32'), { cmd: 'tasklist', args: [] });
  assert.deepEqual(psCommand('darwin'), { cmd: 'pgrep', args: ['-afi', 'daggerfall online'] });
  assert.deepEqual(psCommand('linux'), { cmd: 'pgrep', args: ['-afi', 'daggerfall online'] });
});

test('unconfigured feed url is reported, not mistaken for offline', async () => {
  const { isFeedConfigured } = await import('../updater/lib/flow.js');
  assert.equal(isFeedConfigured('https://example.invalid/ru-pack-feed.json'), false);
  assert.equal(isFeedConfigured('https://releases.example.com/ru-pack-feed.json'), true);
  assert.equal(isFeedConfigured('C:\\packs\\feed.json'), true, 'local stand stays usable');
  assert.equal(isFeedConfigured(''), false);
});

test('default feed points at packs/feed.json on main', async () => {
  const { DEFAULT_FEED_URL, FEED_PACKS_BASE, isFeedConfigured } = await import('../updater/lib/flow.js');
  assert.equal(
    DEFAULT_FEED_URL,
    'https://raw.githubusercontent.com/onomatheater/Daggerfall-Online-RU-localization/main/packs/feed.json',
  );
  assert.equal(FEED_PACKS_BASE + '/feed.json', DEFAULT_FEED_URL);
  assert.equal(isFeedConfigured(DEFAULT_FEED_URL), true);
});
