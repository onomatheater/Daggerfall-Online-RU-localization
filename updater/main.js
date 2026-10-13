// Шелл окна апдейтера: считает view нашим viewOf и шлёт странице,
// страница (их launcher.js, без изменений) только рисует.
// Сеть: два GET (фид, zip) и только из check/install — руками или
// включённым авточеком. Телеметрии и аплоада нет.
import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir, homedir } from 'node:os';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { detectGameVersion } from '../tools/detect-game.mjs';
import { resolveGameLocaleDir } from '../tools/game-prefs.mjs';
import { listPacks, rollbackPack } from '../tools/pack-store.mjs';
import { installUpdate, decideStartup, loadFeedText, checkGameUpdate, isGameRunning, restoreFailReason, shaProblem, isFeedConfigured, DEFAULT_FEED_URL, GAME_RELEASES_PAGE } from './lib/flow.js';
import { GAME_API_LATEST, GAME_API_LIST, LINKS, WINDOW, NEWS, TMP_PREFIXES, defaultGameDir } from './lib/config.js';
import { runCheck as runCheckLib, runInstall as runInstallLib } from './lib/actions.js';
import { isLocalPath, filePathFromUrl, resolvePickedGameDir, isHttpUrl } from './lib/paths.js';
import { viewOf } from './lib/view.js';
import { unpackZip } from './lib/unzip.js';
import { launchGame } from './lib/launch.js';
import { readAsarPackageJson } from './lib/asar.js';
import { loadPrefs, savePrefs } from './lib/prefs.js';

// Хост фида — packs/feed.json на main нашего репозитория.
// RU_FEED_URL — стенд: локальный путь к feed.json вместо сети.
// Остальные константы окна — updater/lib/config.js.
const FEED_URL = process.env.RU_FEED_URL || DEFAULT_FEED_URL;
const DEFAULT_GAME_DIR = defaultGameDir(process.env);

const userData = () => app.getPath('userData');
const storeDir = () => join(userData(), 'packs');
const gameDir = () => loadPrefs(userData()).gameDir || DEFAULT_GAME_DIR;
const game = () => detectGameVersion(gameDir(), { readAsar: readAsarPackageJson });
// Prefs-локаль игры (<userData>/Prefs/Locale/ru): пак кладём туда (data-only),
// рецепт-dist — только fallback для игр без Prefs-поддержки (не трогаем).
const prefsLocaleDir = () => resolveGameLocaleDir({ platform: process.platform, env: process.env, home: homedir() });
const installed = () => listPacks(storeDir());

const state = { check: null, gameUpdate: null, gameNews: [], busy: false, progress: null, pending: null };

function currentView() {
  return viewOf({
    game: game(),
    installed: installed(),
    check: state.check,
    gameNews: state.gameNews,
    gameUpdate: state.gameUpdate,
    busy: state.busy,
    progress: state.progress,
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
  // Предикат один на оба места (см. restoreTranslation): updater/lib/paths.js.
  if (isLocalPath(url)) {
    const { copyFileSync } = await import('node:fs');
    copyFileSync(filePathFromUrl(url), dest);
    return dest;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`zip ${res.status}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

async function loadFeed() {
  if (isHttpUrl(FEED_URL)) return fetchText(FEED_URL);
  return loadFeedText(FEED_URL, {
    fetchText,
    readText: (path) => readFileSync(path, 'utf8'),
  });
}

async function runCheck() {
  // Решения и статусы — updater/lib/actions.js (тестируется в node);
  // здесь только замыкания Electron. Битый фид виден как bad-feed.
  const hit = game();
  return runCheckLib({
    gameVersion: hit.version,
    gameReason: hit.reason,
    currentVersion: installed()[0]?.version,
    loadFeed,
    feedConfigured: isFeedConfigured(FEED_URL),
  });
}

// Лента новостей игры — их releases API (note: текст целиком, движок режет сам).
async function runGameNews() {
  try {
    const res = await fetch(GAME_API_LIST);
    if (!res.ok) return [];
    const list = await res.json();
    if (!Array.isArray(list)) return [];
    return list.slice(0, NEWS.perPage).map((r) => ({
      version: String(r.tag_name ?? '').replace(/^app-v/, ''),
      date: String(r.published_at ?? '').slice(0, NEWS.dateLen),
      badge: 'update',
      text: String(r.body ?? '').slice(0, NEWS.bodyMax),
    }));
  } catch (err) {
    // Лента — тихая по DA6, но ошибку логируем: молчание в UI, не в консоли.
    console.error('[updater] game news failed:', err);
    return [];
  }
}
async function runGameCheck(current) {
  if (!current) return { status: 'unknown' };
  try {
    const res = await fetch(GAME_API_LATEST);
    if (!res.ok) return { status: 'failed' };
    const verdict = checkGameUpdate({ apiText: await res.text(), currentVersion: current });
    return verdict.available ? { status: 'available', tag: verdict.tag } : { status: 'current' };
  } catch (err) {
    console.error('[updater] game check failed:', err);
    return { status: 'failed' };
  }
}

async function runInstall(entry) {
  // Установка — updater/lib/actions.js; сеть падает в net-error внутри,
  // остальное пробрасывает причины. Неожиданный throw логируем, а не
  // маскируем молча: UI-контракт знает только net-error.
  try {
    return await runInstallLib({
      entry,
      fetchZip,
      unpack: unpackZip,
      storeDir: storeDir(),
      prefsDir: prefsLocaleDir(),
      mkTmp: () => mkdtempSync(join(tmpdir(), TMP_PREFIXES[0])),
      rmTmp: (tmp) => rmSync(tmp, { recursive: true, force: true }),
    });
  } catch (err) {
    console.error('[updater] install crashed:', err);
    return { ok: false, reason: 'net-error' };
  }
}

// Подбор мусора прошлых прогонов (наши префиксы), молча.
function pruneTmp() {
  let names = [];
  try {
    names = readdirSync(tmpdir());
  } catch {
    // tmp не читается — подбирать нечего, следующий запуск попробует снова.
    return;
  }
  for (const name of names) {
    if (TMP_PREFIXES.some((p) => name.startsWith(p))) {
      rmSync(join(tmpdir(), name), { recursive: true, force: true });
    }
  }
}

function createWindow() {
  const root = dirname(fileURLToPath(import.meta.url));
  const win = new BrowserWindow({
    width: WINDOW.width,
    height: WINDOW.height,
    useContentSize: true,
    resizable: false,
    maximizable: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0c11',
    title: 'Обновление перевода',
    icon: join(root, 'assets', 'icon.ico'),
    webPreferences: { preload: join(root, 'preload.js'), sandbox: true },
  });
  win.loadFile(join(root, 'launcher/index.html'));
  ipcMain.on('launcher:ready', () => push(win));
  return win;
}

app.whenReady().then(() => {
  const win = createWindow();
  const refresh = () => push(win);
  // Возврат перевода: миграция -> рецепт -> маркеры. Общая для кнопки
  // «Продолжить» после установщика и ручного «Восстановить перевод».
  const restoreTranslation = async (recipeRef, onStage) => {
    const hit = game();
    if (hit.version === null) return { status: 'unknown-game', reason: hit.reason };
    if (!recipeRef || typeof recipeRef.url !== 'string') return { status: 'no-recipe' };
    if (await isGameRunning()) {
      dialog.showMessageBox(win, {
        message: 'Закрой игру перед восстановлением перевода.',
        detail: 'Файлы игры заняты запущенной копией.',
      });
      return null;
    }
    onStage(20, 'Готовлю распакованную установку…');
    const { ensureUnpacked } = await import('./lib/migrate.js');
    await ensureUnpacked({
      resourcesDir: join(gameDir(), 'resources'),
      backupPath: join(userData(), 'backups', `app-asar-${hit.version}.asar`),
    });
    onStage(50, 'Качаю рецепт перевода…');
    const tmp = mkdtempSync(join(tmpdir(), TMP_PREFIXES[1]));
    try {
      const zipPath = join(tmp, 'recipe.zip');
      if (isLocalPath(recipeRef.url)) {
        const { copyFileSync } = await import('node:fs');
        copyFileSync(filePathFromUrl(recipeRef.url), zipPath);
      } else {
        await fetchZip(recipeRef.url, zipPath);
      }
      const { verifyFileSha } = await import('../tools/update-ru.mjs');
      const shaIssue = shaProblem(recipeRef);
      if (shaIssue !== null) return { status: 'install-failed', reason: shaIssue };
      {
        const sha = verifyFileSha(zipPath, recipeRef.sha);
        if (!sha.ok) return { status: 'install-failed', reason: sha.reason };
      }
      onStage(75, 'Возвращаю перевод…');
      const { unpackZip } = await import('./lib/unzip.js');
      const unpackDir = join(tmp, 'recipe');
      unpackZip(zipPath, unpackDir);
      const { readFileSync: readJson } = await import('node:fs');
      const recipe = JSON.parse(readJson(join(unpackDir, 'recipe.json'), 'utf8'));
      if (recipe.game !== hit.version) return { status: 'no-recipe' };
      const { applyRecipe, verifyApplied } = await import('./lib/dist-apply.js');
      const appDir = join(gameDir(), 'resources', 'app', 'dist');
      const rep = await applyRecipe({
        appDir,
        recipe,
        backupDir: join(userData(), 'backups', `vanilla-${hit.version}`),
      });
      if (!rep.ok) return { status: 'install-failed', reason: rep.reason };
      const verify = verifyApplied({ appDir, recipe });
      if (!verify.ok) return { status: 'install-failed', reason: verify.reason };
      return { status: 'translation-restored' };
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  };
  const runRestore = async (recipeRef) => {
    state.busy = true;
    state.progress = { percent: 5, label: 'Смотрю версию игры…' };
    refresh();
    try {
      const result = await restoreTranslation(recipeRef, (percent, label) => {
        state.progress = { percent, label };
        refresh();
      });
      if (result !== null) {
        state.check = result;
        state.pending = null;
      }
    } catch (err) {
      state.check = { status: 'install-failed', reason: restoreFailReason(err) };
      state.pending = null;
    } finally {
      state.busy = false;
      state.progress = null;
    }
    refresh();
  };
  ipcMain.on('launcher:act', async (_ev, { action, arg }) => {
    if (action === 'open') {
      if (Object.hasOwn(LINKS, arg)) shell.openExternal(LINKS[arg]);
    } else if (action === 'set-update-check') {
      savePrefs(userData(), { ...loadPrefs(userData()), autoCheck: arg === true });
      refresh();
    } else if (action === 'choose-folder') {
      const { canceled, filePaths } = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
      // Папка сохраняется, только если в ней видна игра: иначе прежняя
      // остаётся, а окно честно говорит, что папка не подошла.
      const picked = !canceled
        ? resolvePickedGameDir(filePaths, (dir) => detectGameVersion(dir, { readAsar: readAsarPackageJson }))
        : null;
      if (picked !== null) {
        savePrefs(userData(), { ...loadPrefs(userData()), gameDir: picked });
        state.check = null;
        state.gameUpdate = null;
        state.pending = null;
      } else if (!canceled) {
        dialog.showMessageBox(win, {
          message: 'В этой папке игра не найдена.',
          detail: 'Выбери папку с установленной игрой.',
        });
      }
      refresh();
    } else if (action === 'check') {
      state.busy = true;
      refresh();
      try {
        state.check = await runCheck();
        state.pending = state.check.status === 'available' ? state.check.entry : null;
        state.gameUpdate = await runGameCheck(game().version);
        state.gameNews = await runGameNews();
      } finally {
        state.busy = false;
      }
      refresh();
    } else if (action === 'download-game') {
      // Игра обновляется руками (решение 12.10, установщик не качаем):
      // открываем страницу релизов, дальше штатно. Заметили новую версию —
      // баннер; поставили — «Восстановить перевод» вернёт русский рецептом.
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
    } else if (action === 'restore-translation') {
      await runRestore(state.pending?.recipe);
    } else if (action === 'play') {
      if (state.busy) return;
      const hit = game();
      if (hit.version === null) {
        state.check = { status: 'unknown-game', reason: hit.reason };
      } else {
        const launched = launchGame({ gameDir: gameDir() });
        if (!launched.ok) state.check = { status: 'install-failed', reason: launched.reason };
      }
      refresh();
    } else if (action === 'rollback') {
      const prev = rollbackPack(storeDir());
      if (prev === null) return;
      state.busy = true;
      refresh();
      try {
        const tmp = mkdtempSync(join(tmpdir(), TMP_PREFIXES[0]));
        try {
          const rep = installUpdate({
            zipPath: join(storeDir(), prev.file),
            entry: prev,
            unpackDir: join(tmp, 'pack'),
            storeDir: storeDir(),
            unpack: unpackZip,
            prefsDir: prefsLocaleDir(),
          });
          state.check = rep.ok
            ? { status: 'up-to-date', entry: prev }
            : { status: 'install-failed', reason: rep.reason ?? (rep.errors ?? []).join('; ') };
          state.pending = null;
        } finally {
          rmSync(tmp, { recursive: true, force: true });
        }
      } finally {
        state.busy = false;
      }
      refresh();
    }
  });
  (async () => {
    // Новости игры — всегда при старте, как у них (один GET к публичным
    // релизам, без данных пользователя). Проверка пака — за кнопкой.
    pruneTmp();
    state.gameNews = await runGameNews();
    refresh();
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
