// Оркестратор GUI-апдейтера: чистая логика без Electron (тестируется в node).
// Скачивание (fetch) — снаружи и только по кнопке пользователя; сюда приходят
// готовые feedText/zipPath. Порядок: sha -> распаковка -> installPack -> стор.
// Ложь наружу не идёт: каждый отказ — {ok:false} с причиной, клиент живёт дальше.
import { selectPack } from '../../tools/feed-ru.mjs';
import { verifyFileSha, installPack } from '../../tools/update-ru.mjs';
import { storePack } from '../../tools/pack-store.mjs';
import { cmpVersion } from '../../src/locale/loader.js';

export function checkForUpdate({ feedText, gameVersion, currentVersion } = {}) {
  const entry = selectPack(feedText, gameVersion);
  if (entry === null) return { status: 'no-compatible', entry: null };
  if (currentVersion === undefined || cmpVersion(entry.version, currentVersion) > 0) {
    return { status: 'available', entry };
  }
  return { status: 'up-to-date', entry };
}

export function installUpdate({ zipPath, entry, unpackDir, storeDir, unpack, keep } = {}) {
  if (!entry || typeof entry.version !== 'string') return { ok: false, reason: 'no pack entry selected' };
  let shaChecked = false;
  if (entry.sha !== undefined) {
    const sha = verifyFileSha(zipPath, entry.sha);
    if (!sha.ok) return { ok: false, reason: sha.reason };
    shaChecked = true;
  }
  try {
    const un = unpack(zipPath, unpackDir);
    if (!un || un.ok !== true) return { ok: false, reason: 'unpack failed' };
  } catch (err) {
    return { ok: false, reason: `unpack failed: ${err.message}` };
  }
  const installed = installPack(unpackDir);
  if (!installed.ok) return { ok: false, errors: installed.errors, stats: installed.stats };
  storePack(storeDir, {
    srcPath: zipPath,
    version: entry.version,
    game: entry.game ?? entry.gameMin ?? 'unknown',
    sha: entry.sha,
    keep,
  });
  return { ok: true, version: entry.version, shaChecked, stats: installed.stats };
}
