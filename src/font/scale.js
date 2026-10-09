// Прод-дизайн размера текста: замена зум-хака пробы (patch-fontscale.mjs).
// Корень бага пробы: нестандартный `zoom` только на 2 селекторах
// (.px-home .px-menu, .panes .list) — остальной UI (диалоги, чат, SDF-канвас)
// масштаб не видели. Здесь — стандартный font-size через --ru-fs на :root,
// покрытие всех текстовых поверхностей + адаптив (перенос вместо налезания
// «строчки через текст» при 150%). Вес 600 по AGENTS.md §1 (500 пробы —
// нечитаем), минимум 14px. Чисто клиентское состояние (AGENTS.md §2):
// localStorage + CSS-переменная, сеть/сейвы не трогаем.
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

// Один блок инжектится в boot (как HANDJET_FACE): @font-face идемпотентен,
// CSS-переменная — тоже. Без `zoom`: масштабируем font-size корневого
// контейнера, rem-единицы подхватывают всё дерево.
export function buildScaleCSS() {
  return [
    `:root{${SCALE_VAR}:${scaleVar(SCALE_DEFAULT)};--ru-base:14px;}`,
    `.px-menu,.panes,.px-dialog,.px-chat,.row-name,.px-home,.panes .list{font-size:calc(var(--ru-base) * var(${SCALE_VAR},1));min-height:14px;}`,
    `.px-menu .doorbtn,.railbtn .rk,.row-name,.px-divider .px-divword{font-weight:600;}`,
    `.px-menu,.panes,.px-dialog,.px-chat{max-width:100%;flex-wrap:wrap;overflow-wrap:anywhere;word-break:break-word;}`,
    `.row,.ru-fsrow{flex-wrap:wrap;max-width:100%;}`,
  ].join('\n');
}
