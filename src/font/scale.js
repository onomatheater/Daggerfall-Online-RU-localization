// Прод-дизайн размера текста: замена зум-хака пробы (patch-fontscale.mjs).
// v1 била только по контейнерам — листья с собственным px-размером
// (.railbtn .rk 15px, .px-menu button 28px, …) наследование глушат, и скрин
// 150% показал частичный масштаб: рейлы мелкие, строки крупные. v2 доопределяет
// КАЖДЫЙ лист абсолютным calc(base * var(--ru-fs)) — без двойного счёта —
// с префиксом body (0,2,1 бьёт 0,2,0 апстрима); при 100% сток байт-в-байт.
// Базы сверены с апстримом 15e6525cd (enhancedStyle/enhancedPlusStyle).
// Вес 600 по AGENTS.md §1, минимум 14px. Чисто клиентское состояние (§2):
// localStorage + CSS-переменная, сеть/сейвы не трогаем. Без `zoom`.
export const SCALE_MIN = 80;
export const SCALE_MAX = 150;
export const SCALE_STEP = 5;
export const SCALE_DEFAULT = 100;
export const SCALE_KEY = 'ruFontScale';
export const SCALE_VAR = '--ru-fs';

export function clampScale(v) {
  const n = Number(v);
  const base = Number.isFinite(n) ? n : SCALE_DEFAULT;
  const stepped = Math.round(base / SCALE_STEP) * SCALE_STEP;
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, stepped));
}

export const scaleVar = (v) => String(clampScale(v) / 100);

const V = `var(${SCALE_VAR},1)`;
// Префикс специфичности вынесен в константу, а не размазан по 15 местам:
// 0,2,1 бьёт 0,2,0 апстрима (см. шапку). Убрать префикс можно только
// с render-proof по живой игре — без неё это слепое ослабление.
const SPEC = 'body';
const leaf = (sel, base) => `${SPEC} ${sel}{font-size:calc(${base} * ${V});}`;

// Листья как данные: селектор + стоковая база апстрима 15e6525cd.
// Любая смена базы/селектора роняет пин-тест в test/font-scale.test.js.
export const LEAVES = [
  ['.railbtn .rk', '15px'],
  ['.subbtn', '14px'],
  ['.subbtn .count', '11px'],
  ['.packtab .count', '11px'],
  ['.row-name', '14px'],
  ['.px-sys .row-name', '15px'],
  ['.px-setwrap .row-name', '15px'],
  ['.row-note', '12.5px'],
  ['.row-sub', '12.5px'],
  ['.px-divword', '13px'],
  ['.dcard h3', '22px'],
  ['.shell .dcard h3', '20px'],
  ['.dcard p', '13px'],
  ['.dcard .status', '13px'],
  ['.px-note', '17px'],
  ['.px-menu button .px-c', '22px'],
];

// Один блок инжектится в boot (как HANDJET_FACE). Порядок: сначала контейнеры
// (тянут безлистные наследники), потом листья (бьют px-правила апстрима).
export function buildScaleCSS() {
  return [
    `:root{${SCALE_VAR}:${scaleVar(SCALE_DEFAULT)};--ru-base:14px;}`,
    `.px-menu,.panes,.px-dialog,.px-chat,.row-name,.px-home,.panes .list{font-size:calc(var(--ru-base) * ${V});min-height:14px;}`,
    ...LEAVES.map(([sel, base]) => leaf(sel, base)),
    // Десктопные двери: сток 28px (.px-menu button); телефонные 22px и
    // компакт не трогаем — там свои законы (44px-тап, узкий стейдж).
    `@media (min-width:481px){${SPEC} .px-menu:not(.px-compact) button{font-size:calc(28px * ${V});}}`,
    // v3: коробки растут вместе со шрифтом (иначе пропорции рвёт: большой
    // текст в 44px-кнопке). Тот же SPEC-префикс бьёт правила апстрима.
    `${SPEC} .row{gap:calc(14px * ${V});padding:calc(11px * ${V}) calc(18px * ${V});min-height:calc(52px * ${V});}`,
    `${SPEC} .row-main{padding:calc(6px * ${V}) 0;min-height:calc(44px * ${V});}`,
    `${SPEC} .subbtn{padding:calc(11px * ${V}) calc(16px * ${V});min-height:calc(46px * ${V});}`,
    `${SPEC} .px-home .px-menu{width:min(calc(384px * ${V}),100%);gap:calc(8px * ${V});}`,
    `${SPEC} .shell:not(.wizard) .railbtn{min-height:calc(44px * ${V});padding:calc(10px * ${V}) calc(16px * ${V});}`,
    `@media (min-width:481px){${SPEC} .px-menu .doorbtn{padding:calc(6px * ${V}) calc(24px * ${V});}}`,
    `${SPEC} .px-menu .doorbtn,${SPEC} .railbtn .rk,${SPEC} .row-name,${SPEC} .px-divword{font-weight:600;}`,
    // Длинные RU-строки в фиксированных колонках: перенос вместо клипа
    // (СЕТЕВАЯ ИГР…). При 100% и коротком тексте layout не меняется.
    `${SPEC} .px-menu button{max-width:100%;min-width:0;white-space:normal;overflow-wrap:anywhere;word-break:break-word;}`,
    `.px-menu,.panes,.px-dialog,.px-chat{max-width:100%;flex-wrap:wrap;overflow-wrap:anywhere;word-break:break-word;}`,
    `.row,.ru-fsrow{flex-wrap:wrap;max-width:100%;min-width:0;}`,
    `.row-main{min-width:0;}`,
  ].join('\n');
}
