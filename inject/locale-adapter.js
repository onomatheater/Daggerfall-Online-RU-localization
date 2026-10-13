// Адаптер встройки пака в клиент daggerfall-js-source.
// Два исхода ответа разработчиков покрываются одним файлом:
//  - PR в апстрим: этот модуль ложится в src/locale/ как есть;
//  - внешний оверлей: грузится первым скриптом и подменяет те же точки.
// Правила врезки (подробно — inject/README.md):
//  - литерал 'You see %s.' → wrapLiteral('strings:youSee', { s: name });
//  - шаблон `${name} just died.` → wrapTemplate('strings:thingJustDied', { s: name }).
// Нюанс кавычек: значения DFU-мастеров иногда в кавычках ("'%s just died.'"),
// а клиент рисует без них — call site решает strip'ом, адаптер текст не правит.
//
// Карта путей (урок пробы 7815: в src/locale/ клиента '../src/…' не резолвится).
// В репозитории файл живёт в inject/, при PR-исходе ложится в src/locale/
// клиента как есть, а два импорта переписываются строго так:
//   '../src/locale/locale.js' -> './locale.js'
//   '../src/locale/loader.js' -> './loader.js'
// Перепись — шаг пробного патча (tmp), не вилка файла: канон один, здесь.
//
// Рантайм-пак (оверлей-исход): setGameVersion + registerPack кладут таблицы
// пака поверх bundled. Чужой/битый пак -> {ok:false}, bundled не тронут.
// wrap* сначала смотрят в пак (has), иначе — как раньше через t().
import { t, tp, getLocale, hasKey, splitKey, setLocale } from '../src/locale/locale.js';
import { createOverlay, parseManifest, isCompatible, resolvePlural } from '../src/locale/loader.js';
import { applyParams } from '../src/locale/params.js';
export { t, tp, getLocale, hasKey, splitKey, setLocale };

const packOverlay = createOverlay({});
// Локаль рантайм-пака одна — именованная константа, не магия 'ru' по файлу.
const PACK_LOCALE = 'ru';
let gameVersion = '';

export function setGameVersion(version) {
  if (typeof version === 'string') {
    gameVersion = version;
    return;
  }
  if (typeof console !== 'undefined') console.warn(`[adapter] setGameVersion: bad version, keeping '${gameVersion}'`);
}

export function registerPack(pack, version = gameVersion) {
  const fail = (reason) => ({ ok: false, reason });
  if (!pack || typeof pack !== 'object') return fail('pack: need {manifest, tables}');
  let manifest;
  try {
    manifest = parseManifest(pack.manifest);
  } catch (err) {
    return fail(`pack: ${err.message}`);
  }
  if (!isCompatible(manifest, version)) return fail(`pack ${manifest.version} incompatible with game ${version || '<unknown>'}`);
  if (!pack.tables || typeof pack.tables !== 'object') return fail('pack: need tables');
  for (const [table, rows] of Object.entries(pack.tables)) {
    packOverlay.register(PACK_LOCALE, table, rows);
  }
  return { ok: true, version: manifest.version };
}

function wrap(key, params, fallback) {
  if (packOverlay.has(key, getLocale())) return packOverlay.resolve(key, params, getLocale());
  // Явный total miss: call site держит EN-дефолт (tOr-паритет),
  // иначе — честный bundled t() (с варнингом внутри при промахе).
  if (!hasKey(key) && fallback !== undefined) return applyParams(String(fallback), params);
  return t(key, params);
}

export function wrapLiteral(key, params = {}, fallback) {
  return wrap(key, params, fallback);
}

export function wrapTemplate(key, params = {}, fallback) {
  return wrap(key, params, fallback);
}

// Plural-рендер поверх пака: объект {one,few,many} -> строка через plural(),
// иначе (нет в паке) — как bundled через tp(). Арность как у tp:
// params и локаль пробрасываются, а не хардкодятся.
export function wrapPlural(key, n, params = {}, locale) {
  const loc = locale ?? getLocale();
  if (packOverlay.has(key, loc)) return resolvePlural(packOverlay, key, n, params, loc);
  return tp(key, n, params, loc);
}
