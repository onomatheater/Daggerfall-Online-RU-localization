// Оркестратор GUI-апдейтера: чистая логика без Electron (тестируется в node).
// Скачивание (fetch) — снаружи и только по кнопке пользователя; сюда приходят
// готовые feedText/zipPath. Порядок: sha -> распаковка -> installPack -> стор.
// Ложь наружу не идёт: каждый отказ — {ok:false} с причиной, клиент живёт дальше.
import { selectPack } from '../../tools/feed-ru.mjs';
import { verifyFileSha, installPack } from '../../tools/update-ru.mjs';
import { storePack } from '../../tools/pack-store.mjs';
import { cmpVersion } from '../../src/locale/loader.js';
import updateCheck from '../vendor-dfo/updateCheck.cjs';

// Фид: http(s) — сеть (только по кнопке), иначе локальный путь (демо/стенд).
export async function loadFeedText(source, { fetchText, readText } = {}) {
  const src = String(source ?? '');
  if (/^https?:\/\//i.test(src)) return fetchText(src);
  return readText(src);
}

// Notice-механика разработчиков (их чистый updateCheck.cjs, MIT):
// новее ли релизный тег текущей версии. Мусор = тихо available:false.
// Игру никогда не трогаем — только баннер и кнопка на страницу релизов.
export function checkGameUpdate({ apiText, currentVersion } = {}) {
  let tag = null;
  try {
    tag = JSON.parse(String(apiText))?.tag_name ?? null;
  } catch {
    return { available: false };
  }
  const ok = updateCheck.isNewerRelease(currentVersion, tag);
  return ok ? { available: true, tag } : { available: false };
}

// Человеческие причины на русском: сырой английский наружу не идёт.
const ISSUE_RU = [
  [/no package\.json or app-update\.yml/, 'Игра не найдена: нет package.json и app-update.yml'],
  [/no package\.json, app-update\.yml or app\.asar/, 'Игра не найдена: нет package.json, app-update.yml и app.asar'],
  [/app\.asar unreadable/, 'Не получилось прочитать версию из app.asar'],
  [/app\.asar package\.json has no version/, 'В app.asar нет версии'],
  [/package\.json is not JSON/, 'package.json испорчен'],
  [/package\.json has no version/, 'В package.json нет версии'],
  [/app-update\.yml has no version/, 'В app-update.yml нет версии'],
  [/fetch failed|ENOTFOUND|UND_ERR|ETIMEDOUT|timeout|network|getaddrinfo|net-error/i, 'Нет соединения с сервером паков'],
  [/^unknown(-game)?$/, 'Неизвестная ошибка'],
];

export function describeIssue(reason) {
  const text = String(reason ?? '');
  for (const [pattern, ru] of ISSUE_RU) {
    if (pattern.test(text)) return ru;
  }
  const latin = text.replace(/[^A-Za-z ]/g, '').trim();
  if (latin.length >= 4) return `Не получилось: ${text}`;
  return text.length > 0 ? text : 'Неизвестная ошибка';
}

// Тихая автопроверка при старте — только с согласия (флаг) и известной игрой.
// Их закон DA6: авто = тишина (ошибка никому не показывается), ручная = громко.
export function decideStartup({ autoCheck, gameVersion } = {}) {
  return autoCheck === true && typeof gameVersion === 'string' && gameVersion.length > 0 ? 'check' : 'idle';
}

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
