// Тихая установка обновления игры + цепочка «игра -> перевод».
// NSIS setup ставится молча в ту же папку (/S /D=); ставит сам установщик,
// мы только качаем, сверяем, запускаем, проверяем версию после.
// Отказ на любом шаге — {status:'game-install-failed', reason} (дерево игры
// до успешного сетапа не тронуто). Игра запущена — отдельный статус
// game-busy: ставить поверх запущенной копии нельзя.
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { statfsSync } from 'node:fs';
import { selectGameAsset, parseLatestYml } from './game-release.js';
import { downloadBytes, checkDiskSpace } from './download.js';

export function installArgs(gameDir) {
  return ['/S', `/D=${gameDir}`];
}

// Новейший релиз из JSON списка GitHub API (первый элемент).
// Пустой/битый список — null, дальше решает вызывающий слой.
export function latestRelease(apiText) {
  let list;
  try {
    list = JSON.parse(String(apiText));
  } catch {
    return null;
  }
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[0] ?? null;
}

// Свободное место в байтах (statfsSync). Нечитаемо — null, не throw.
export function diskFreeBytes(dir, { statfs = statfsSync } = {}) {
  try {
    const st = statfs(dir);
    const free = Number(st?.bavail) * Number(st?.bsize);
    return Number.isFinite(free) ? free : null;
  } catch {
    return null;
  }
}

export function runSetup({ exe, gameDir, spawn } = {}) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(exe, installArgs(gameDir), {});
    } catch (err) {
      resolve({ ok: false, reason: `game setup failed: spawn: ${err?.message ?? err}` });
      return;
    }
    child.on('error', (err) => resolve({ ok: false, reason: `game setup failed: spawn: ${err?.message ?? err}` }));
    child.on('close', (code) => {
      if (code === 0) resolve({ ok: true, code });
      else resolve({ ok: false, reason: `game setup failed: code ${code}` });
    });
  });
}

export async function runGameUpdate({
  releaseJson, platform = process.platform, gameDir, running = false,
  fetchText, fetchFn, writeFile, freeBytes, spawn, detectVersion,
  mkTmp, rmTmp, onStage = () => {},
} = {}) {
  const fail = (reason) => ({ status: 'game-install-failed', reason });
  if (running) return { status: 'game-busy', reason: 'close the game first' };
  const asset = selectGameAsset(releaseJson, platform);
  if (!asset.ok) return fail(asset.reason);
  let ymlText;
  try {
    ymlText = await fetchText(asset.meta.url);
  } catch {
    return fail('net-error');
  }
  let meta;
  try {
    meta = parseLatestYml(ymlText);
  } catch (err) {
    return fail(String(err?.message ?? err));
  }
  const file = meta.files.find((f) => f.url === asset.installer.name) ?? meta.files[0];
  const tmp = mkTmp();
  try {
    const disk = checkDiskSpace(tmp, file.size, { freeBytes });
    if (!disk.ok) return fail(disk.reason);
    onStage(10, 'Качаю обновление игры…');
    let bytes;
    try {
      bytes = await downloadBytes({
        url: asset.installer.url,
        fetchFn,
        onProgress: ({ received, total }) => {
          const frac = total ? received / total : 0;
          onStage(10 + Math.round(70 * Math.min(1, frac)), 'Качаю обновление игры…');
        },
      });
    } catch {
      return fail('net-error');
    }
    const sha = checkBytes(bytes, file);
    if (!sha.ok) return fail(sha.reason);
    onStage(85, 'Ставлю обновление игры…');
    const setupPath = join(tmp, asset.installer.name);
    writeFile(setupPath, bytes);
    const setup = await runSetup({ exe: setupPath, gameDir, spawn });
    if (!setup.ok) return fail(setup.reason);
    onStage(95, 'Проверяю версию игры…');
    const hit = detectVersion(gameDir);
    if (!hit || hit.version === null || hit.version === undefined) {
      return fail(`game detect failed: ${hit?.reason ?? 'unknown'}`);
    }
    if (String(hit.version) !== String(meta.version)) {
      return fail(`game version mismatch: want ${meta.version}, have ${hit.version}`);
    }
    onStage(100, 'Игра обновлена.');
    return { status: 'game-updated', version: String(hit.version) };
  } finally {
    rmTmp(tmp);
  }
}

// Сверка байтов в памяти (setup ещё не записан): размер + sha512 из yml.
function checkBytes(bytes, file) {
  if (bytes.length !== file.size) {
    return { ok: false, reason: `size mismatch: download is ${bytes.length}, yml says ${file.size}` };
  }
  if (typeof file.sha512 !== 'string') return { ok: false, reason: 'sha missing: yml entry has no sha512' };
  const digest = createHash('sha512').update(bytes).digest('base64');
  if (digest !== file.sha512) return { ok: false, reason: 'sha mismatch: downloaded game file' };
  return { ok: true };
}
