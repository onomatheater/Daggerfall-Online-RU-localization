// Пути стенда апдейтера: file-пути и win-диски читаются с диска,
// http(s) — сетью по кнопке. Один предикат на оба call site main.js
// (fetchZip и restoreTranslation делили копию regex).
import { join } from 'node:path';
import { TMP_PREFIXES } from './config.js';

// http(s) — сеть по кнопке, всё остальное — локальные пути/стенды.
// Один предикат на loadFeed/feedConfigured/loadFeedText (дубль regex убит).
export function isHttpUrl(url) {
  return /^https?:\/\//i.test(String(url ?? ''));
}
export function isLocalPath(url) {
  const s = String(url ?? '');
  if (s.length === 0) return false;
  // win-диск, file://, posix-абсолют, UNC: всё это читается с диска.
  // ~ — тоже локально (раскрывается в filePathFromUrl); голый относительный
  // путь — нет (неоднозначная база), ему место в fetch-ошибке, не в copy.
  return /^[a-zA-Z]:[\\/]/.test(s) || s.startsWith('file://') || s.startsWith('/') || s.startsWith('\\\\') || s.startsWith('~/');
}

// file:// URL -> fs-путь; обычный путь возвращается как есть.
// Процент-эскейпы декодируются (иначе %20 ломает copyFileSync);
// битый эскейп — как есть, упадёт громко в copyFileSync, не молча.
// file://localhost/ — тот же локальный файл (хост отрезается);
// ~/ — дом пользователя (передаётся снаружи, в тесте — явно).
export function filePathFromUrl(url, home = '') {
  const s = String(url ?? '');
  if (s.startsWith('~/') && home) return home + s.slice(1);
  if (!s.startsWith('file://')) return s;
  let path = s.replace(/^file:\/\//, '').replace(/^localhost\//i, '');
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

// Папка из диалога становится папкой игры, только если в ней видна игра:
// detect(dir).version !== null. Иначе — прежняя папка, молча не сохраняем.
export function resolvePickedGameDir(filePaths, detect) {
  const picked = Array.isArray(filePaths) ? filePaths[0] : undefined;
  if (typeof picked !== 'string' || picked.length === 0) return null;
  try {
    const hit = detect(picked);
    if (hit && hit.version !== null && hit.version !== undefined) return picked;
  } catch {
    return null;
  }
  return null;
}

// Сегмент версии в fs-путь: версия читается из чужих package.json/asar
// (недоверенный ввод) — всё кроме [0-9a-zA-Z._-] режется в '_', traversal
// вида ../../x рассыпается в безопасный мусор, а не в выход из директории.
export function safeSegment(s) {
  const out = String(s ?? '').replace(/[^a-zA-Z0-9._-]+/g, '_');
  return out.length > 0 ? out : 'unknown';
}

export function backupAsarName(version) {
  return `app-asar-${safeSegment(version)}.asar`;
}

export function backupVanillaName(version) {
  return `vanilla-${safeSegment(version)}`;
}

// Подбор мусора прошлых прогонов по нашим префиксам. Занятая запись
// не роняет проход (иначе умирал startup до первой отрисовки):
// возвращается { removed, failed }, throw никогда.
export function pruneTmpDir(tmpDir, { readdir, rm, prefixes = TMP_PREFIXES, joinPath = join } = {}) {
  let names;
  try {
    names = readdir(tmpDir);
  } catch {
    return { removed: 0, failed: [] };
  }
  const failed = [];
  let removed = 0;
  for (const name of names) {
    if (!prefixes.some((p) => name.startsWith(p))) continue;
    try {
      rm(joinPath(tmpDir, name));
      removed += 1;
    } catch {
      failed.push(name);
    }
  }
  return { removed, failed };
}
