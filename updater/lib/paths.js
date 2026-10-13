// Пути стенда апдейтера: file-пути и win-диски читаются с диска,
// http(s) — сетью по кнопке. Один предикат на оба call site main.js
// (fetchZip и restoreTranslation делили копию regex).
export function isLocalPath(url) {
  const s = String(url ?? '');
  if (s.length === 0) return false;
  return /^[a-zA-Z]:[\\/]/.test(s) || s.startsWith('file://');
}

// file:// URL -> fs-путь; обычный путь возвращается как есть.
export function filePathFromUrl(url) {
  const s = String(url ?? '');
  return s.startsWith('file://') ? s.replace(/^file:\/\//, '') : s;
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
