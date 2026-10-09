// Таблицы изолированы: ключ `table:key`, дефолтная таблица — strings.
// Числовые ID разных таблиц (items:1 vs spells:1) никогда не пересекаются.
// Fallback: ru[table][key] → en[table][key] → key как есть (+ варнинг).
import en from './en.json' with { type: 'json' };
import ru from './ru.json' with { type: 'json' };

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

// tOr: перевод, а нет — переданный фолбэк (обычно исходный EN-лейбл),
// без утечки ключа в UI и без варнинга: отсутствие — норма, не баг.
export function tOr(rawKey, fallback, params = {}, locale = cur) {
  const [table, key] = splitKey(rawKey);
  const hit = tables[locale]?.[table]?.[key] ?? tables.en?.[table]?.[key];
  let s = hit ?? fallback;
  for (const v of Object.values(params)) s = s.replaceAll('%s', String(v));
  for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
