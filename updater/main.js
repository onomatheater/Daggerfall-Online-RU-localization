// Шелл окна апдейтера: считает view нашим viewOf и шлёт странице,
// страница (их launcher.js, без изменений) только рисует.
// Сеть: два GET (фид, zip) и только из check/install — руками или
// включённым авточеком. Телеметрии и аплоада нет.
import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { detectGameVersion } from '../tools/detect-game.mjs';
import { listPacks, rollbackPack } from '../tools/pack-store.mjs';
import { checkForUpdate, installUpdate, decideStartup, loadFeedText, checkGameUpdate } from './lib/flow.js';
import { viewOf } from './lib/view.js';
import { unpackZip } from './lib/unzip.js';
import { readAsarPackageJson } from './lib/asar.js';
import { loadPrefs, savePrefs } from './lib/prefs.js';

// Хост фида заполняет человек при релизе (стабильный URL feed.json).
// RU_FEED_URL — стенд: локальный путь к feed.json вместо сети.
const FEED_URL = process.env.RU_FEED_URL || 'https://example.invalid/ru-pack-feed.json';
const GAME_API_URL = 'https://api.github.com/repos/Lattymoy/daggerfall-js-source/releases/latest';
const GAME_RELEASES_PAGE = 'https://github.com/Lattymoy/daggerfall-js-source/releases/latest';
// Ссылки разработчиков — те же, что в их лаунчере (Lattymoy, MIT).
const LINKS = {
  site: 'https://daggerfalljs.dev/',
  discord: 'https://discord.gg/jM2JdwSM8w',
};
const DEFAULT_GAME_DIR = `${process.env.LOCALAPPDATA ?? ''}\\Programs\\Daggerfall Online`;

const userData = () => app.getPath('userData');
const storeDir = () => join(userData(), 'packs');
const gameDir = () => loadPrefs(userData()).gameDir || DEFAULT_GAME_DIR;
const game = () => detectGameVersion(gameDir(), { readAsar: readAsarPackageJson });
const installed = () => listPacks(storeDir());

const state = { check: null, gameUpdate: null, busy: false, pending: null };

function currentView() {
  return viewOf({
    game: game(),
    installed: installed(),
    check: state.check,
    gameUpdate: state.gameUpdate,
    busy: state.busy,
    prefs: loadPrefs(userData()),
    gameDir: gameDir(),
  });
}

function push(win) {
  if (win && !win.isDestroyed()) win.webContents.send('launcher:view', currentView());
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`feed ${res.status}`);
  return res.text();
}

async function fetchZip(url, dest) {
  // Демо/стенд: file-путь читается с диска, http(s) — сетью по кнопке.
  if (/^[a-zA-Z]:[\\/]/.test(url) || url.startsWith('file://')) {
    const { copyFileSync } = await import('node:fs');
    copyFileSync(url.replace(/^file:\/\//, ''), dest);
    return dest;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`zip ${res.status}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

async function loadFeed() {
  if (/^https?:\/\//i.test(FEED_URL)) return fetchText(FEED_URL);
  return loadFeedText(FEED_URL, {
    fetchText,
    readText: (path) => readFileSync(path, 'utf8'),
  });
}

async function runCheck() {
  const hit = game();
  if (hit.version === null) return { status: 'unknown-game', reason: hit.reason };
  try {
    const text = await loadFeed();
    return checkForUpdate({ feedText: text, gameVersion: hit.version, currentVersion: installed()[0]?.version });
  } catch {
    return { status: 'net-error' };
  }
}

// Проверка игры — их notice-механика: новее тег = баннер + кнопка на релизы,
// всё остальное = тишина (игру не трогаем никогда).
async function runGameCheck(current) {
  if (!current) return { status: 'unknown' };
  try {
    const res = await fetch(GAME_API_URL);
    if (!res.ok) return { status: 'failed' };
    const verdict = checkGameUpdate({ apiText: await res.text(), currentVersion: current });
    return verdict.available ? { status: 'available', tag: verdict.tag } : { status: 'current' };
  } catch {
    return { status: 'failed' };
  }
}

async function runInstall(entry) {
  try {
    const tmp = mkdtempSync(join(tmpdir(), 'ruapp-'));
    const zipPath = join(tmp, 'ru-pack.zip');
    await fetchZip(entry.url, zipPath);
    return installUpdate({ zipPath, entry, unpackDir: join(tmp, 'pack'), storeDir: storeDir(), unpack: unpackZip });
  } catch {
    return { ok: false, reason: 'net-error' };
  }
}

function createWindow() {
  const root = dirname(fileURLToPath(import.meta.url));
  const win = new BrowserWindow({
    width: 900,
    height: 640,
    autoHideMenuBar: true,
    title: 'Обновление перевода',
    webPreferences: { preload: join(root, 'preload.js'), sandbox: true },
  });
  win.loadFile(join(root, 'launcher/index.html'));
  ipcMain.on('launcher:ready', () => push(win));
  return win;
}

app.whenReady().then(() => {
  const win = createWindow();
  const refresh = () => push(win);
  ipcMain.on('launcher:act', async (_ev, { action, arg }) => {
    if (action === 'open') {
      if (Object.hasOwn(LINKS, arg)) shell.openExternal(LINKS[arg]);
    } else if (action === 'set-update-check') {
      savePrefs(userData(), { ...loadPrefs(userData()), autoCheck: arg === true });
      refresh();
    } else if (action === 'choose-folder') {
      const { canceled, filePaths } = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
      if (!canceled && filePaths[0]) {
        savePrefs(userData(), { ...loadPrefs(userData()), gameDir: filePaths[0] });
        state.check = null;
        state.gameUpdate = null;
        state.pending = null;
      }
      refresh();
    } else if (action === 'check') {
      state.busy = true;
      refresh();
      try {
        state.check = await runCheck();
        state.pending = state.check.status === 'available' ? state.check.entry : null;
        state.gameUpdate = await runGameCheck(game().version);
      } finally {
        state.busy = false;
      }
      refresh();
    } else if (action === 'download-game') {
      shell.openExternal(GAME_RELEASES_PAGE);
    } else if (action === 'install') {
      const entry = state.pending;
      if (!entry) return;
      state.busy = true;
      refresh();
      try {
        const rep = await runInstall(entry);
        if (rep.ok) {
          state.check = { status: 'up-to-date', entry };
          state.pending = null;
        } else {
          state.check = { status: 'install-failed', reason: rep.reason ?? (rep.errors ?? []).join('; ') };
        }
      } finally {
        state.busy = false;
      }
      refresh();
    } else if (action === 'rollback') {
      const prev = rollbackPack(storeDir());
      if (prev === null) return;
      state.busy = true;
      refresh();
      try {
        const tmp = mkdtempSync(join(tmpdir(), 'ruapp-'));
        const rep = installUpdate({
          zipPath: join(storeDir(), prev.file),
          entry: prev,
          unpackDir: join(tmp, 'pack'),
          storeDir: storeDir(),
          unpack: unpackZip,
        });
        state.check = rep.ok
          ? { status: 'up-to-date', entry: prev }
          : { status: 'install-failed', reason: rep.reason ?? (rep.errors ?? []).join('; ') };
        state.pending = null;
      } finally {
        state.busy = false;
      }
      refresh();
    }
  });
  (async () => {
    const hit = game();
    if (decideStartup({ autoCheck: loadPrefs(userData()).autoCheck, gameVersion: hit.version }) === 'check') {
      state.check = await runCheck();
      state.pending = state.check.status === 'available' ? state.check.entry : null;
      const gu = await runGameCheck(hit.version);
      state.gameUpdate = gu.status === 'available' ? gu : null;
      refresh();
    }
  })();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { app.quit(); });
