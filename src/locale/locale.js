import en from './en.json' with { type: 'json' };
import ru from './ru.json' with { type: 'json' };

const tables = { en, ru };
let cur = 'en';

export const setLocale = (l) => {
  cur = tables[l] ? l : 'en';
};
export const getLocale = () => cur;

export function t(key, params = {}, locale = cur) {
  const table = tables[locale] ?? tables.en;
  let s = table?.[key] ?? tables.en[key] ?? key;
  for (const v of Object.values(params)) s = s.replaceAll('%s', String(v));
  for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
