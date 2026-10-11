// Таблицы изолированы: ключ `table:key`, дефолтная таблица — strings.
// Числовые ID разных таблиц (items:1 vs spells:1) никогда не пересекаются.
// Fallback: ru[table][key] → en[table][key] → key как есть (+ варнинг).
import en from './en.json' with { type: 'json' };
import ru from './ru.json' with { type: 'json' };
import { plural } from './morph.js';

const tables = { en, ru };
let cur = 'en';

export const setLocale = (l) => {
  cur = tables[l] ? l : 'en';
};
export const getLocale = () => cur;

export function splitKey(raw) {
  const i = String(raw).indexOf(':');
  return i < 0 ? ['strings', String(raw)] : [String(raw).slice(0, i), String(raw).slice(i + 1)];
}

export function t(rawKey, params = {}, locale = cur) {
  const [table, key] = splitKey(rawKey);
  const hit = tables[locale]?.[table]?.[key] ?? tables.en?.[table]?.[key];
  let s = hit ?? rawKey;
  if (hit === undefined && typeof console !== 'undefined') console.warn(`[locale] missing key: ${rawKey}`);
  for (const v of Object.values(params)) s = s.replaceAll('%s', String(v));
  for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

// tp(key, n): plural-рендер запечённых форм {one,few,many} (см. morph.js).
// Нет ключа — как t(): fallback-строка без падения (предупреждение уже в t).
export function tp(rawKey, n) {
  const hit = t(rawKey);
  if (hit && typeof hit === 'object') return plural(n, hit);
  return hit;
}
