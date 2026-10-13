// src/locale/translit.js — транслитерация слогов NameGen на рендере.
// RNG и порядок draws не трогаем: тот же сид даёт то же имя, только кириллицей.
// Неизвестный слог = EN + warn (доктрина fallback), не краш.
import table from './ru/names/syllables.json' with { type: 'json' };

// Суффикс нордских фамилий — из словаря (nameHelper.surname: 0+1+'sen').
// Ключ '@nordSuffix' в syllables.json, не константа в коде.
export const NORD_SUFFIX_RU = typeof table['@nordSuffix'] === 'string' ? table['@nordSuffix'] : 'сен';

export function translitPart (part) {
  const hit = table[part];
  if (typeof hit === 'string' && hit) return hit;
  console.warn(`[locale] missing translit: ${part}`);
  return part;
}
