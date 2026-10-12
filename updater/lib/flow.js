// Оркестратор GUI-апдейтера: чистая логика без Electron (тестируется в node).
// Скачивание (fetch) — снаружи и только по кнопке пользователя; сюда приходят
// готовые feedText/zipPath. Порядок: sha -> распаковка -> installPack -> стор.
// Ложь наружу не идёт: каждый отказ — {ok:false} с причиной, клиент живёт дальше.
import { selectPack } from '../../tools/feed-ru.mjs';
import { verifyFileSha, installPack } from '../../tools/update-ru.mjs';
import { storePack } from '../../tools/pack-store.mjs';
import { cmpVersion } from '../../src/locale/loader.js';
import updateCheck from '../vendor-dfo/updateCheck.cjs';

// Стабильная страница релизов игры (их REL5: версия в теге, не в имени файла).
// Игру качаем только руками с этой страницы: установщик мы не тянем
// (решение человека 12.10) — апдейтер замечает новую версию и возвращает
// перевод рецептом.
export const GAME_RELEASES_PAGE = 'https://github.com/Lattymoy/daggerfall-js-source/releases/latest';

// Команда списка процессов по платформе: win — tasklist, остальное — pgrep
// (macOS и почти весь linux его имеют; нет — тихо false, как раньше).
export function psCommand(platform = process.platform) {
  if (platform === 'win32') return { cmd: 'tasklist', args: [] };
  return { cmd: 'pgrep', args: ['-afi', 'daggerfall online'] };
}

const defaultListProcesses = () => new Promise((resolve) => {
  import('node:child_process').then(({ execFile }) => {
    const { cmd, args } = psCommand();
    execFile(cmd, args, (err, stdout) => resolve(err ? '' : String(stdout ?? '')));
  });
});

// Игра запущена? Только чтение списка процессов, ничего не трогаем.
// Матчим имя на любой строке: Daggerfall Online.exe (win),
// .../Daggerfall Online.app/... (mac), .../Daggerfall Online (linux).
export async function isGameRunning(listProcesses = defaultListProcesses) {
  const list = await listProcesses();
  return /daggerfall online/i.test(String(list));
}

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

// Человеческие причины на русском: известные отказы маппятся полностью,
// неизвестные остаются громкими с деталью (держит тест detect-game).
const ISSUE_RU = [
  [/no package\.json or app-update\.yml/, 'Игра не найдена: нет package.json и app-update.yml'],
  [/no package\.json, app-update\.yml or app\.asar/, 'Игра не найдена: нет package.json, app-update.yml и app.asar'],
  [/app\.asar unreadable/, 'Не получилось прочитать версию из app.asar'],
  [/app\.asar package\.json has no version/, 'В app.asar нет версии'],
  [/package\.json is not JSON/, 'package.json испорчен'],
  [/package\.json has no version/, 'В package.json нет версии'],
  [/app-update\.yml has no version/, 'В app-update.yml нет версии'],
  [/fetch failed|ENOTFOUND|UND_ERR|ETIMEDOUT|timeout|network|getaddrinfo|net-error/i, 'Нет соединения с сервером паков'],
  [/no pack entry selected/, 'Пак не выбран: нечего устанавливать'],
  [/unpack failed/, 'Не получилось распаковать пак: скачай его заново из релизов'],
  [/sha mismatch/, 'Скачанный файл не сошёлся по sha: подмена или битый файл, остаёшься на старом паке'],
  [/sha missing/, 'У пака нет sha в фиде: ставить нечего, остаёшься на старом паке'],
  [/missing file:/, 'Файл не найден: скачай пак заново из релизов'],
  [/migrate:/, 'Не получилось подготовить распакованную установку игры'],
  [/base mismatch/, 'Перевод не лёг на эту версию игры: жди пак под неё, игра при этом работает'],
  [/markers lost/, 'В рецепте нет меток перевода: он не от этой версии игры'],
  [/content mismatch|missing after apply|apply failed/, 'Перевод не встал: установка игры не тронута'],
  [/bad recipe shape/, 'Рецепт перевода испорчен: жди следующий выпуск'],
  [/empty backup|rollback failed/, 'Откат не удался: предыдущий пак недоступен'],
  [/^unknown(-game)?$/, 'Неизвестная ошибка'],
];

// Причина провала восстановления перевода: сырое сообщение наружу,
// viewOf через describeIssue скажет по-русски. Пусто -> net-error.
export function restoreFailReason(err) {
  const text = String(err?.message ?? err ?? '').trim();
  return text.length > 0 ? text : 'net-error';
}

export function describeIssue(reason) {
  const text = String(reason ?? '');
  for (const [pattern, ru] of ISSUE_RU) {
    if (pattern.test(text)) return ru;
  }
  const latin = text.replace(/[^A-Za-z ]/g, '').trim();
  if (latin.length >= 4) return `Не получилось: ${text}`;
  return text.length > 0 ? text : 'Неизвестная ошибка';
}

// Фид настроен? example.invalid — заглушка до релиза (URL задаёт человек
// при выпуске, см. docs/updater.md): её не трогаем сетью и не врём про
// «нет соединения». Локальный путь — стенд, он настроен всегда.
export function isFeedConfigured(url) {
  const src = String(url ?? '').trim();
  if (src.length === 0) return false;
  if (/^https?:\/\//i.test(src)) return !/example\.invalid/i.test(src);
  return true;
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

// Гейт sha256: пак и рецепт без валидного sha не ставятся никак —
// ни сетью, ни локальным file://-стендом. Пусто -> null вперёд.
export function shaProblem(entry) {
  const sha = entry?.sha;
  if (typeof sha !== 'string' || !/^[0-9a-f]{64}$/i.test(sha)) {
    return 'sha missing: entry has no sha256';
  }
  return null;
}

export function installUpdate({ zipPath, entry, unpackDir, storeDir, unpack, keep } = {}) {
  if (!entry || typeof entry.version !== 'string') return { ok: false, reason: 'no pack entry selected' };
  const shaIssue = shaProblem(entry);
  if (shaIssue !== null) return { ok: false, reason: shaIssue };
  const sha = verifyFileSha(zipPath, entry.sha);
  if (!sha.ok) return { ok: false, reason: sha.reason };
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
    notes: entry.notes,
    keep,
  });
  return { ok: true, version: entry.version, shaChecked: true, stats: installed.stats };
}
