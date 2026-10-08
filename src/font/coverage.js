// Контракт покрытия SDF-атласа классического текста.
// Апстрим (src/ui/text.js) сидит строку в атлас только для кодов из сида
// лица (DFU:707-716); классический сид — латиница 33..272. Этот набор —
// то, что сборка атласа обязана покрыть для RU: полный кириллический блок
// (включая Ёё U+0401/U+0451), Ґґ/Іі из cyrillic-сабсета Handjet, плюс
// пунктуация, которой пишет Jagget: «» (кавычки в квестах), — (тире),
// № (U+2116). Неизвестный код в рантайме → '?' (FNT_ERROR_CODE), не пробел.
// Интеграция в игру: скормить COVERAGE сидом в buildSdfFace() рядом с
// vendor/handjet ttf (см. Task 3 плана).
const add = (out, lo, hi) => { for (let cp = lo; cp <= hi; cp++) out.push(cp); };
const list = [];
add(list, 0x0400, 0x045f);
add(list, 0x0490, 0x0491);
add(list, 0x04b0, 0x04b1);
list.push(0x00ab, 0x00bb, 0x2014, 0x2116);

export const COVERAGE = Object.freeze(list.slice().sort((a, b) => a - b));
const set = new Set(COVERAGE);
export const has = (cp) => set.has(cp);
export const RANGES = Object.freeze(['U+0400-045F', 'U+0490-0491', 'U+04B0-04B1', 'U+00AB,U+00BB,U+2014,U+2116']);
