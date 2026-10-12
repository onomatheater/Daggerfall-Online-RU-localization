// Обновление перевода: главное окно. Вся логика — в updater/lib/flow.js
// и tools-ядре (покрыты тестами); здесь только окно + IPC-мост.
// Сеть: два GET (фид, zip) и только из обработчиков кнопок — фоном не ходим,
// телеметрии и аплоада нет.
import { app, BrowserWindow, ipcMain } from 'electron';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { detectGameVersion } from '../tools/detect-game.mjs';
import { listPacks, rollbackPack } from '../tools/pack-store.mjs';
import { checkForUpdate, installUpdate } from './lib/flow.js';
import { unpackZip } from './lib/unzip.js';

// Хост фида заполняет человек при релизе (стабильный URL feed.json).
const FEED_URL = 'https://example.invalid/ru-pack-feed.json';
const GAME_DIR = `${process.env.LOCALAPPDATA ?? ''}\\Programs\\Daggerfall Online`;
const STORE_DIR = join(app.getPath('userData'), 'packs');

const gameVersion = () => detectGameVersion(GAME_DIR);
const currentVersion = () => listPacks(STORE_DIR)[0]?.version;

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`feed ${res.status}`);
  return res.text();
}

async function fetchZip(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`zip ${res.status}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

function createWindow() {
  const root = dirname(fileURLToPath(import.meta.url));
  const win = new BrowserWindow({
    width: 480,
    height: 620,
    resizable: false,
    autoHideMenuBar: true,
    title: 'Обновление перевода',
    webPreferences: { preload: join(root, 'preload.js') },
  });
  win.loadFile(join(root, 'renderer/index.html'));
}

app.whenReady().then(() => {
  ipcMain.handle('game', () => gameVersion());
  ipcMain.handle('installed', () => listPacks(STORE_DIR));
  ipcMain.handle('check', async () => {
    const game = gameVersion();
    if (game.version === null) return { status: 'unknown-game', reason: game.reason };
    const feedText = await fetchText(FEED_URL);
    return checkForUpdate({ feedText, gameVersion: game.version, currentVersion: currentVersion() });
  });
  ipcMain.handle('install', async (_ev, entry) => {
    const tmp = mkdtempSync(join(tmpdir(), 'ruapp-'));
    const zipPath = join(tmp, 'ru-pack.zip');
    await fetchZip(entry.url, zipPath);
    return installUpdate({
      zipPath,
      entry,
      unpackDir: join(tmp, 'pack'),
      storeDir: STORE_DIR,
      unpack: unpackZip,
    });
  });
  ipcMain.handle('rollback', async () => {
    const prev = rollbackPack(STORE_DIR);
    if (prev === null) return { ok: false, reason: 'откатываться некуда' };
    const tmp = mkdtempSync(join(tmpdir(), 'ruapp-'));
    return installUpdate({
      zipPath: join(STORE_DIR, prev.file),
      entry: prev,
      unpackDir: join(tmp, 'pack'),
      storeDir: STORE_DIR,
      unpack: unpackZip,
    });
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { app.quit(); });
