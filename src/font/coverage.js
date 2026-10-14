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

// Человекочитаемые диапазоны выводятся из COVERAGE сворачиванием,
// а не второй рукой: два источника дрейфовали бы независимо.
const hex = (cp) => cp.toString(16).toUpperCase().padStart(4, '0');
function rangesOf(sorted) {
  const out = [];
  let start = null;
  let prev = null;
  const flush = () => {
    out.push(start === prev ? `U+${hex(start)}` : `U+${hex(start)}-${hex(prev)}`);
  };
  for (const cp of sorted) {
    if (start === null) {
      start = cp;
      prev = cp;
    } else if (cp === prev + 1) {
      prev = cp;
    } else {
      flush();
      start = cp;
      prev = cp;
    }
  }
  if (start !== null) flush();
  // Одиночки сливаются запятой (пунктуация Jagget), диапазоны — отдельно:
  // формат держит исторический вид RANGES для читаемости контракта.
  const singles = [];
  const ranges = [];
  for (const r of out) (r.includes('-') ? ranges : singles).push(r);
  return [...ranges, singles.join(',')].filter((s) => s.length > 0);
}
export const RANGES = Object.freeze(rangesOf(COVERAGE));
