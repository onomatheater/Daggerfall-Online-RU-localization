// Handjet-на замену Pixelify для RU: веса только 400/500/700 (100-300 —
// точечный конструкт, нечитаемы). Сабсеты cyrillic + latin (OFL-1.1,
// vendor/handjet/OFL.txt; пин версии fontsource — 5.3.0). В вендоре лежат
// и -ext файлы, но пак везёт только используемые: ext-диапазоны игре не
// нужны (контракт покрытия — src/font/coverage.js), мёртвый вес не шиппим.
export const HANDJET_FILES = [
  'handjet-cyrillic-400-normal.woff2',
  'handjet-cyrillic-500-normal.woff2',
  'handjet-cyrillic-700-normal.woff2',
  'handjet-latin-400-normal.woff2',
  'handjet-latin-500-normal.woff2',
  'handjet-latin-700-normal.woff2',
];

const RANGE = {
  cyrillic: 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116',
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
};
// cyrillic-ext/latin-ext в вендоре лежат, но FACE их не эмитит и пак не везёт:
// ext-диапазоны игре не нужны (см. комментарий HANDJET_FILES), висячих
// записей в RANGE нет — только шиппаемое.

const face = (subset, weight) =>
  `@font-face{font-family:'Handjet';font-style:normal;font-weight:${weight};font-display:swap;src:url(/vendor/handjet/handjet-${subset}-${weight}-normal.woff2) format('woff2');unicode-range:${RANGE[subset]};}`;

// Один и тот же блок инжектится в каждый изолированный лист (чат, меню,
// инвентарь) — как PIXELIFY_FIVE_FACE в апстриме: @font-face идемпотентен.
export const HANDJET_FACE = [
  ...[400, 500, 700].map((w) => face('cyrillic', w)),
  ...[400, 500, 700].map((w) => face('latin', w)),
].join('\n');

// Handjet первым, Pixelify — фолбэк латиницы, если пак подключён без вендора.
export const HANDJET_STACK = `'Handjet','Pixelify Sans',monospace`;
