// Пути стенда апдейтера: file-пути и win-диски читаются с диска,
// http(s) — сетью по кнопке. Один предикат на оба call site main.js
// (fetchZip и restoreTranslation делили копию regex).

// http(s) — сеть по кнопке, всё остальное — локальные пути/стенды.
// Один предикат на loadFeed/feedConfigured/loadFeedText (дубль regex убит).
export function isHttpUrl(url) {
  return /^https?:\/\//i.test(String(url ?? ''));
}
export function isLocalPath(url) {
  const s = String(url ?? '');
  if (s.length === 0) return false;
  return /^[a-zA-Z]:[\\/]/.test(s) || s.startsWith('file://');
}

// file:// URL -> fs-путь; обычный путь возвращается как есть.
// Процент-эскейпы декодируются (иначе %20 ломает copyFileSync);
// битый эскейп — как есть, упадёт громко в copyFileSync, не молча.
export function filePathFromUrl(url) {
  const s = String(url ?? '');
  if (!s.startsWith('file://')) return s;
  const path = s.replace(/^file:\/\//, '');
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
