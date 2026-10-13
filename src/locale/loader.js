// Рантайм-лоадер оверлей-пака: пак переживает апдейт игры.
// Игра обновляется штатным каналом (ваниль), перевод докачивается
// отдельным ru-pack.zip (см. tools/pack-ru.mjs) и регистрируется здесь
// в рантайме — без правки app.asar и без ребилда клиента.
// Почему так: статический import в locale.js перетирается апдейтером
// вместе с asar; overlay-таблицы живут поверх и гейтятся по версии игры.
import { splitKey } from './locale.js';
import { plural } from './morph.js';
import { applyParams } from './params.js';
export { splitKey };

// Имена файлов пака: загрузчик и адаптер читают одни константы,
// а не дублируют строки 'locale-version.json'/'ru.json'.
export const MANIFEST_FILE = 'locale-version.json';
export const RU_FILE = 'ru.json';

export function parseManifest(text) {
  // Строка (сеть/файл) или готовый объект (рантайм-пак): валидация одна.
  let parsed = text;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      throw new Error('manifest: not JSON');
    }
  } else if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('manifest: not JSON');
  }
  if (!parsed || parsed.locale !== 'ru' || typeof parsed.version !== 'string' || !Array.isArray(parsed.files)) {
    throw new Error('manifest: need {locale:ru, version, files[]}');
  }
  return parsed;
}

// Канон версии игры: клиент отдаёт dotted ('0.1.7553'), клейма паков —
// короткий билд ('7553'). Сравниваем по канону с обеих сторон, иначе
// фид никогда не сходится с живой игрой. Мусор -> '' + warn (ложь, не краш,
// но несовместим: isCompatible вернёт false).
export function canonGameVersion(version) {
  const parts = String(version ?? '').split('.');
  const last = parts[parts.length - 1] ?? '';
  if (/^\d+$/.test(last)) return String(Number(last));
  if (typeof console !== 'undefined') console.warn(`[locale] bad game version: ${version}`);
  return '';
}

// Совместимость пака с игрой: точный тег game ИЛИ диапазон gameMin/gameMax.
// Верх опционален: gameMin без gameMax = «эта и новее» (потолка нет by design:
// пак — словарь, новые ключи честно падают в EN + очередь синка, старые лежат).
// Пол обязателен снизу: на старше gameMin ключей может не быть вовсе.
// Без клейма — несовместим, молча не едем. Инвертированный диапазон — брак.
export function isCompatible(manifest, gameVersion) {
  if (!manifest || typeof gameVersion !== 'string' || gameVersion.length === 0) return false;
  const game = canonGameVersion(gameVersion);
  // Мусор с любой стороны — несовместим: пустой канон ведёт себя как 0
  // в cmpVersion, так что '' отбрасываем явно, а не сравнением.
  if (game === '') return false;
  if (manifest.game !== undefined) return canonGameVersion(manifest.game) === game;
  const { gameMin, gameMax } = manifest;
  const min = typeof gameMin === 'string' ? canonGameVersion(gameMin) : '';
  const max = typeof gameMax === 'string' ? canonGameVersion(gameMax) : '';
  if (min !== '' && max !== '') {
    return cmpVersion(min, game) <= 0 && cmpVersion(game, max) <= 0;
  }
  if (min !== '') return cmpVersion(min, game) <= 0;
  if (max !== '') return cmpVersion(game, max) <= 0;
  return false;
}

export const cmpVersion = (a, b) => {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (Number.isNaN(x) || Number.isNaN(y)) return NaN;
    const d = x - y;
    if (d !== 0) return d;
  }
  return 0;
};

// Новейший совместимый пак под игру, иначе null (не краш, не пустота в UI).
// Битая version пака сортируется ниже здоровой (а не стабильно-мусорно):
// NaN-компаратор детерминированно проигрывает любой валидной версии.
const isSaneVersion = (v) => String(v).split('.').every((p) => /^\d+$/.test(p));
export function choosePack(packs, gameVersion) {
  const fitting = (packs ?? []).filter((p) => isCompatible(p, gameVersion));
  fitting.sort((a, b) => {
    const d = cmpVersion(a.version, b.version);
    if (!Number.isNaN(d)) return d;
    const aBad = !isSaneVersion(a.version);
    const bBad = !isSaneVersion(b.version);
    if (aBad && !bBad) return -1;
    if (bBad && !aBad) return 1;
    return 0;
  });
  return fitting.length > 0 ? fitting[fitting.length - 1] : null;
}

// Overlay-резолвер: overlay[locale] -> bundled en -> key + warn.
// locale.js не трогаем (его делят соседние батчи);/EventTarget нет —
// переключатель языка остаётся setLocale + ре-рендер на стороне клиента.
export function createOverlay(bundled) {
  const overlay = {};
  const en = bundled?.en ?? {};
  return {
    register(locale, table, rows) {
      if (typeof locale !== 'string' || typeof table !== 'string' || !rows || typeof rows !== 'object') {
        if (typeof console !== 'undefined') console.warn(`[locale] overlay register: bad args locale=${locale} table=${table}`);
        return;
      }
      overlay[locale] = overlay[locale] ?? {};
      overlay[locale][table] = { ...(overlay[locale][table] ?? {}), ...rows };
    },
    resolve(rawKey, params = {}, locale = 'ru') {
      const [table, key] = splitKey(rawKey);
      const hit = overlay[locale]?.[table]?.[key] ?? en?.[table]?.[key];
      let s = hit ?? rawKey;
      if (hit === undefined && typeof console !== 'undefined') console.warn(`[locale] missing key: ${rawKey}`);
      if (typeof s !== 'string') return s;
      return applyParams(s, params);
    },
    // Явное наличие в паке (без фолбэка): адаптер решает, кому рендерить —
    // overlay-паку или bundled t(). Сравнением строк это не делается.
    has(rawKey, locale = 'ru') {
      const [table, key] = splitKey(rawKey);
      return overlay[locale]?.[table]?.[key] !== undefined;
    },
    // Plural-рендер запечённых форм {one,few,many} (см. morph.js):
    // объект -> plural(n) + остаток params (паритет с tp),
    // строка -> как resolve() с теми же params, miss -> key + warn.
    resolvePlural(rawKey, n, params = {}, locale = 'ru') {
      const [table, key] = splitKey(rawKey);
      const hit = overlay[locale]?.[table]?.[key] ?? en?.[table]?.[key];
      if (hit !== undefined && typeof hit === 'object') return applyParams(plural(n, hit), params);
      return this.resolve(rawKey, params, locale);
    },
  };
}

// Отдельный хелпер для тестов и адаптера: выбор формы поверх overlay-экземпляра.
export function resolvePlural(ov, rawKey, n, params = {}, locale = 'ru') {
  return ov.resolvePlural(rawKey, n, params, locale);
}

// Браузерный загрузчик внешнего пака: игра читает Prefs/Locale/ru/ через fetch
// (node:fs в бандле нет). fetchJson(url) инжектится: тест даёт стаб, игра —
// fetch(url).then((r) => r.json()). Форма {manifest, tables} стыкуется с
// registerPack() из inject/locale-adapter.js без новых API.
// Отказ — {ok:false, reason}, никогда throw: игра живёт дальше на bundled EN.
export async function loadExternalPackFetch({ baseUrl, gameVersion, bundled = { en: {} }, fetchJson } = {}) {
  const fail = (reason) => ({ ok: false, reason });
  if (typeof fetchJson !== 'function') return fail('external-pack: need fetchJson');
  let manifestRaw;
  let tablesRaw;
  try {
    manifestRaw = await fetchJson(`${baseUrl}/${MANIFEST_FILE}`);
    tablesRaw = await fetchJson(`${baseUrl}/${RU_FILE}`);
  } catch (err) {
    return fail(`external-pack: fetch failed: ${err?.message ?? err}`);
  }
  let manifest;
  try {
    manifest = parseManifest(manifestRaw);
  } catch (err) {
    return fail(`external-pack: ${err?.message ?? err}`);
  }
  if (!isCompatible(manifest, gameVersion)) {
    return fail(`external-pack: incompatible pack game=${manifest.game ?? `${manifest.gameMin}-${manifest.gameMax}`} for ${gameVersion}`);
  }
  if (!tablesRaw || typeof tablesRaw !== 'object' || Array.isArray(tablesRaw)) {
    return fail('external-pack: ru.json must be {table: {key: value}}');
  }
  const overlay = createOverlay(bundled);
  for (const [table, rows] of Object.entries(tablesRaw)) {
    overlay.register('ru', table, rows);
  }
  return { ok: true, overlay, manifest, tables: tablesRaw };
}
