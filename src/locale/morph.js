// Русская морфология без морфологии в рантайме: движок знает только
// правила выбора готовой формы, сами формы — запечённый словарь.
// one/few/many — классика CLDR для ru (1, 2-4, 0/5-20 + mod10/mod100).
// Падежи месяцев и существительных — полями словаря (таблица months
// в en|ru.json, ключи 0-11); здесь только чтение, не склонение кодом.
import en from './en.json' with { type: 'json' };
import ru from './ru.json' with { type: 'json' };
export function plural(n, forms) {
  const num = Number(n);
  if (!Number.isFinite(num)) {
    if (typeof console !== 'undefined') console.warn(`[locale] plural: bad n=${n}`);
    return String(forms?.many ?? forms?.other ?? '').replaceAll('#', String(n));
  }
  const v = Math.abs(num);
  const d10 = v % 10;
  const d100 = v % 100;
  const pick = d10 === 1 && d100 !== 11 ? 'one' : d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14) ? 'few' : 'many';
  return String(forms[pick] ?? forms.other ?? '').replaceAll('#', String(n));
}

export function select(key, forms) {
  const hit = forms[key] ?? forms.other;
  if (hit === undefined && typeof console !== 'undefined') console.warn(`[locale] select: bad key=${key}`);
  return hit ?? '';
}

// month(index 0-11, case) — чтение словаря months (ru, фолбэк en).
// EN не склоняется: все падежи — та же форма (см. en.json).
const CASES = Object.freeze(['nom', 'gen', 'dat', 'acc', 'inst', 'prep']);

export function month(index, cas = 'nom') {
  const key = String(index);
  const forms = ru.months?.[key] ?? en.months?.[key];
  const sane = CASES.includes(cas) ? cas : 'nom';
  if (sane !== cas && typeof console !== 'undefined') console.warn(`[locale] month: bad cas=${cas}, falling back to nom`);
  const hit = forms?.[sane];
  if (hit === undefined && typeof console !== 'undefined') console.warn(`[locale] month: bad index=${index} cas=${cas}`);
  return hit ?? '';
}
