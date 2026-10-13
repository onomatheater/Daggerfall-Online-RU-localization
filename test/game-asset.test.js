// NEED батча А: апдейтер сам обновляет игру, а не ссылается на сайт.
// - selectGameAsset: setup-ассет под платформу из JSON релиза (каноника DFO-Online);
// - parseLatestYml: версия + файлы с sha512/size из electron-updater yml;
// - verifyGameSha: скачанный setup сверяется с yml (размер + sha512 base64).
import test from 'node:test';
import assert from 'node:assert/strict';

import { selectGameAsset, parseLatestYml, verifyGameSha } from '../updater/lib/game-release.js';

// Форма — как у GitHub API (имена ассетов настоящие, из app-v0.1.8404).
const RELEASE = {
  tag_name: 'app-v0.1.8404',
  assets: [
    { name: 'DaggerfallOnline-win-x64-setup.exe', browser_download_url: 'https://dl/x/setup.exe', size: 239810427 },
    { name: 'DFO-Online-win-x64-setup.exe', browser_download_url: 'https://dl/dfo/setup.exe', size: 239810427 },
    { name: 'DFO-Online-win-x64-setup.exe.blockmap', browser_download_url: 'https://dl/dfo/setup.exe.blockmap', size: 253245 },
    { name: 'DFO-Online-mac-arm64.dmg', browser_download_url: 'https://dl/dfo/mac.dmg', size: 262600659 },
    { name: 'DFO-Online-linux-x86_64.AppImage', browser_download_url: 'https://dl/dfo/lin.AppImage', size: 271901799 },
    { name: 'latest.yml', browser_download_url: 'https://dl/dfo/latest.yml', size: 356 },
    { name: 'latest-mac.yml', browser_download_url: 'https://dl/dfo/latest-mac.yml', size: 348 },
    { name: 'latest-linux.yml', browser_download_url: 'https://dl/dfo/latest-linux.yml', size: 389 },
  ],
};

const YML = [
  'version: 0.1.8404',
  'files:',
  '  - url: DFO-Online-win-x64-setup.exe',
  '    sha512: EwcW1mnbT0AMQ+Ct/20YmEvEv9vHeTORQ6lUH/NEgxKP/g7VLQ0ja2a2Cx+WGAdUNXB3cMtwiHDBDNXSPfZrkg==',
  '    size: 239810427',
  'path: DFO-Online-win-x64-setup.exe',
  'sha512: EwcW1mnbT0AMQ+Ct/20YmEvEv9vHeTORQ6lUH/NEgxKP/g7VLQ0ja2a2Cx+WGAdUNXB3cMtwiHDBDNXSPfZrkg==',
  "releaseDate: '2026-10-13T04:06:23.081Z'",
  '',
].join('\n');

test('asset: setup + yml under platform, DFO-Online first', () => {
  const win = selectGameAsset(RELEASE, 'win32');
  assert.equal(win.ok, true);
  assert.equal(win.version, '0.1.8404');
  assert.equal(win.installer.url, 'https://dl/dfo/setup.exe');
  assert.equal(win.installer.size, 239810427);
  assert.equal(win.meta.url, 'https://dl/dfo/latest.yml');
  const mac = selectGameAsset(RELEASE, 'darwin');
  assert.equal(mac.ok, true);
  assert.equal(mac.installer.url, 'https://dl/dfo/mac.dmg');
  assert.equal(mac.meta.url, 'https://dl/dfo/latest-mac.yml');
  const lin = selectGameAsset(RELEASE, 'linux');
  assert.equal(lin.ok, true);
  assert.equal(lin.installer.url, 'https://dl/dfo/lin.AppImage');
});

test('asset: no installer for platform is loud, not null-crash', () => {
  const rep = selectGameAsset({ tag_name: 'app-v0.1.1', assets: [] }, 'win32');
  assert.equal(rep.ok, false);
  assert.match(rep.reason, /no installer/);
  const bad = selectGameAsset(null, 'win32');
  assert.equal(bad.ok, false);
});

test('yml: version + files with sha512/size', () => {
  const m = parseLatestYml(YML);
  assert.equal(m.version, '0.1.8404');
  assert.equal(m.files.length, 1);
  assert.equal(m.files[0].url, 'DFO-Online-win-x64-setup.exe');
  assert.equal(m.files[0].size, 239810427);
  assert.equal(m.files[0].sha512, 'EwcW1mnbT0AMQ+Ct/20YmEvEv9vHeTORQ6lUH/NEgxKP/g7VLQ0ja2a2Cx+WGAdUNXB3cMtwiHDBDNXSPfZrkg==');
});

test('yml: garbage refuses loudly', () => {
  assert.throws(() => parseLatestYml('not yml at all {{{'), /latest\.yml/);
  assert.throws(() => parseLatestYml('version: 1.2.3\n'), /latest\.yml/);
});

test('game sha: size + base64 sha512 verified from disk', async () => {
  const { createHash } = await import('node:crypto');
  const { writeFileSync, mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'rugame-'));
  const file = join(dir, 'setup.exe');
  writeFileSync(file, 'game-bytes');
  const sha512 = createHash('sha512').update('game-bytes').digest('base64');
  assert.deepEqual(verifyGameSha(file, { sha512, size: 10 }), { ok: true });
  const wrong = verifyGameSha(file, { sha512: createHash('sha512').update('other').digest('base64'), size: 10 });
  assert.equal(wrong.ok, false);
  assert.match(wrong.reason, /sha mismatch/);
  const cut = verifyGameSha(file, { sha512, size: 999 });
  assert.equal(cut.ok, false);
  assert.match(cut.reason, /size mismatch/);
  const missing = verifyGameSha(join(dir, 'nope.exe'), { sha512, size: 10 });
  assert.equal(missing.ok, false);
  assert.match(missing.reason, /missing file/);
});
