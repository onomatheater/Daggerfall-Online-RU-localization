// Таблицы изолированы: ключ `table:key`, дефолтная таблица — strings.
// Числовые ID разных таблиц (items:1 vs spells:1) никогда не пересекаются.
// Fallback: ru[table][key] → en[table][key] → key как есть (+ варнинг).
import en from './en.json' with { type: 'json' };
import ru from './ru.json' with { type: 'json' };
import { plural } from './morph.js';
import { applyParams } from './params.js';

const tables = { en, ru };
let cur = 'en';

export const setLocale = (l) => {
  if (tables[l]) {
    cur = l;
    return;
  }
  if (typeof console !== 'undefined') console.warn(`[locale] unknown locale=${l}, falling back to en`);
  cur = 'en';
};
export const getLocale = () => cur;

export function splitKey(raw) {
  const i = String(raw).indexOf(':');
  return i < 0 ? ['strings', String(raw)] : [String(raw).slice(0, i), String(raw).slice(i + 1)];
}

export function t(rawKey, params = {}, locale) {
  const loc = locale ?? cur;
  const [table, key] = splitKey(rawKey);
  const hit = tables[loc]?.[table]?.[key] ?? tables.en?.[table]?.[key];
  if (hit === undefined && typeof console !== 'undefined') console.warn(`[locale] missing key: ${rawKey}`);
  if (hit !== undefined && typeof hit !== 'string') return hit;
  const s = hit ?? rawKey;
  return applyParams(s, params);
}

export function hasKey(rawKey, locale) {
  const loc = locale ?? cur;
  const [table, key] = splitKey(rawKey);
  return tables[loc]?.[table]?.[key] !== undefined || tables.en?.[table]?.[key] !== undefined;
}

// tp(key, n, params?, locale?): plural-рендер запечённых форм {one,few,many}.
// Нет ключа — как t(): fallback-строка без падения (предупреждение уже в t).
export function tp(rawKey, n, params = {}, locale) {
  const hit = t(rawKey, params, locale);
  // Объект возвращается из t() нетронутым: plural выбирает форму по n,
  // остаток params ({k}) подставляется здесь — в t() он объект не трогал.
  if (hit && typeof hit === 'object') return applyParams(plural(n, hit), params);
  return hit;
}
