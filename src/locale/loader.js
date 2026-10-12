// Рантайм-лоадер оверлей-пака: пак переживает апдейт игры.
// Игра обновляется штатным каналом (ваниль), перевод докачивается
// отдельным ru-pack.zip (см. tools/pack-ru.mjs) и регистрируется здесь
// в рантайме — без правки app.asar и без ребилда клиента.
// Почему так: статический import в locale.js перетирается апдейтером
// вместе с asar; overlay-таблицы живут поверх и гейтятся по версии игры.
import { splitKey } from './locale.js';
import { plural } from './morph.js';
export { splitKey };

export function parseManifest(text) {
  let parsed;
  try {
    parsed = JSON.parse(String(text));
  } catch {
    throw new Error('manifest: not JSON');
  }
  if (!parsed || parsed.locale !== 'ru' || typeof parsed.version !== 'string' || !Array.isArray(parsed.files)) {
    throw new Error('manifest: need {locale:ru, version, files[]}');
  }
  return parsed;
}

// Совместимость пака с игрой: точный тег game ИЛИ inclusive-диапазон
// gameMin/gameMax (паки пересобирать при каждом чихе не надо —
// диапазон заявляет проверенный отрезок; без клейма — несовместим,
// молча не едем, только явный выбор). Инвертированный диапазон — брак.
export function isCompatible(manifest, gameVersion) {
  if (!manifest || typeof gameVersion !== 'string' || gameVersion.length === 0) return false;
  if (manifest.game !== undefined) return manifest.game === gameVersion;
  const { gameMin, gameMax } = manifest;
  if (typeof gameMin !== 'string' || typeof gameMax !== 'string') return false;
  return cmpVersion(gameMin, gameVersion) <= 0 && cmpVersion(gameVersion, gameMax) <= 0;
}

export const cmpVersion = (a, b) => {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
};

// Новейший совместимый пак под игру, иначе null (не краш, не пустота в UI).
export function choosePack(packs, gameVersion) {
  const fitting = (packs ?? []).filter((p) => isCompatible(p, gameVersion));
  fitting.sort((a, b) => cmpVersion(a.version, b.version));
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
      if (typeof locale !== 'string' || typeof table !== 'string' || !rows || typeof rows !== 'object') return;
      overlay[locale] = overlay[locale] ?? {};
      overlay[locale][table] = { ...(overlay[locale][table] ?? {}), ...rows };
    },
    resolve(rawKey, params = {}, locale = 'ru') {
      const [table, key] = splitKey(rawKey);
      const hit = overlay[locale]?.[table]?.[key] ?? en?.[table]?.[key];
      let s = hit ?? rawKey;
      if (hit === undefined && typeof console !== 'undefined') console.warn(`[locale] missing key: ${rawKey}`);
      if (typeof s !== 'string') return s;
      for (const v of Object.values(params)) s = s.replaceAll('%s', String(v));
      for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
      return s;
    },
    // Явное наличие в паке (без фолбэка): адаптер решает, кому рендерить —
    // overlay-паку или bundled t(). Сравнением строк это не делается.
    has(rawKey, locale = 'ru') {
      const [table, key] = splitKey(rawKey);
      return overlay[locale]?.[table]?.[key] !== undefined;
    },
    // Plural-рендер запечённых форм {one,few,many} (см. morph.js):
    // объект -> plural(n), строка -> как resolve(), miss -> key + warn.
    resolvePlural(rawKey, n, locale = 'ru') {
      const [table, key] = splitKey(rawKey);
      const hit = overlay[locale]?.[table]?.[key] ?? en?.[table]?.[key];
      if (hit !== undefined && typeof hit === 'object') return plural(n, hit);
      return this.resolve(rawKey, {}, locale);
    },
  };
}

// Отдельный хелпер для тестов и адаптера: выбор формы поверх overlay-экземпляра.
export function resolvePlural(ov, rawKey, n, locale = 'ru') {
  return ov.resolvePlural(rawKey, n, locale);
}
