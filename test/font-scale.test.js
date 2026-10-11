import test from 'node:test';
import assert from 'node:assert/strict';

// Прод-дизайн замены зум-хака пробы (patch-fontscale.mjs):
// - никакого нестандартного `zoom`, только font-size через --ru-fs;
// - покрытие ВСЕХ текстовых поверхностей, а не 2 селекторов;
// - вес ≥600 и минимум 14px (AGENTS.md §1);
// - адаптив: перенос/клип вместо «строчки через текст» при 150%.
test('scale module exposes clamp + css without zoom hack', async () => {
  const m = await import('../src/font/scale.js');
  assert.equal(typeof m.clampScale, 'function');
  assert.equal(typeof m.buildScaleCSS, 'function');
  assert.equal(m.clampScale(0), 80);
  assert.equal(m.clampScale(999), 150);
  assert.equal(m.clampScale(103), 105);
  const css = m.buildScaleCSS();
  assert.doesNotMatch(css, /zoom\s*:/i);
  assert.match(css, /--ru-fs/);
  assert.match(css, /font-size/);
});

test('scale css covers all surfaces + readable weight + adaptive wrap', async () => {
  const { buildScaleCSS } = await import('../src/font/scale.js');
  const css = buildScaleCSS();
  for (const sel of ['.px-menu', '.panes', '.px-dialog', '.px-chat', '.row-name']) {
    assert.match(css, new RegExp(sel.replace('.', '\\.'), 'i'), `missing ${sel}`);
  }
  assert.match(css, /font-weight:\s*6\d\d/);
  assert.doesNotMatch(css, /font-weight:\s*500/);
  assert.match(css, /14px/);
  assert.match(css, /overflow-wrap|word-break/);
  assert.match(css, /flex-wrap|max-width/);
});

test('fontscale dfo keys exist in en+ru', async () => {
  const en = (await import('../src/locale/en.json', { with: { type: 'json' } })).default;
  const ru = (await import('../src/locale/ru.json', { with: { type: 'json' } })).default;
  assert.equal(en.dfo['fontscale.label'], 'Font size');
  assert.equal(ru.dfo['fontscale.label'], 'Размер шрифта');
});

// v2: листья с собственным px-размером глушат наследование от контейнера
// (скрин 150%: рейлы мелкие, строки крупные). Переопределяем каждый лист
// абсолютным calc(base * var(--ru-fs)) — без двойного масштабирования —
// с префиксом body (0,2,1 бьёт 0,2,0 апстрима), сток при 100% — байт-в-байт.
test('scale css beats upstream leaf specificity with stock bases', async () => {
  const { buildScaleCSS } = await import('../src/font/scale.js');
  const css = buildScaleCSS();
  const leaves = [
    ['body .railbtn .rk', '15px'],
    ['body .subbtn', '14px'],
    ['body .row-name', '14px'],
    ['body .row-note', '12.5px'],
    ['body .px-divword', '13px'],
    ['body .dcard h3', '22px'],
    ['body .dcard p', '13px'],
    ['body .px-note', '17px'],
  ];
  for (const [sel, base] of leaves) {
    const i = css.indexOf(sel);
    assert.ok(i >= 0, `missing leaf ${sel}`);
    const rule = css.slice(i, css.indexOf('}', i));
    assert.match(rule, new RegExp(`calc\\(${base.replace('.', '\\.')} \\* var\\(--ru-fs`));
  }
  // doorbtn: десктопная база 28px (.px-menu button), телефонную 22px не трогаем.
  assert.match(css, /min-width:\s*481px/);
  assert.match(css, /px-compact/);
});

// v2: кнопки меню не режут текст (скрин: СЕТЕВАЯ ИГР…) — перенос внутри
// фиксированной колонки вместо клипа; при 100% layout не меняется.
test('scale css wraps long labels instead of clipping', async () => {
  const { buildScaleCSS } = await import('../src/font/scale.js');
  const css = buildScaleCSS();
  const i = css.indexOf('.px-menu button');
  assert.ok(i >= 0, 'missing doorbtn anti-clip rule');
  const tail = css.slice(i);
  assert.match(tail, /white-space:\s*normal/);
  assert.match(tail, /min-width:\s*0/);
});

// v3: относительный скейл — коробки растут вместе со шрифтом, пропорции
// целы (паттерн апстрима: --dfchat-scale во всех размерных свойствах чата).
// Базы: .row 14/11/18/52, .row-main 6/44, .subbtn 11/16/46,
// .px-home .px-menu 384/8, .doorbtn 6/24, railbtn 44/10/16.
test('scale css scales boxes with fonts, ratios intact', async () => {
  const { buildScaleCSS } = await import('../src/font/scale.js');
  const css = buildScaleCSS();
  const boxes = [
    ['body .row{', 'gap:calc(14px'],
    ['body .row{', 'padding:calc(11px'],
    ['body .row{', 'min-height:calc(52px'],
    ['body .row-main{', 'min-height:calc(44px'],
    ['body .subbtn{padding:calc(11px', 'min-height:calc(46px'],
    ['body .px-home .px-menu{', 'min(calc(384px'],
    ['body .px-home .px-menu{', 'gap:calc(8px'],
  ];
  for (const [sel, prop] of boxes) {
    const i = css.indexOf(sel);
    assert.ok(i >= 0, `missing box rule ${sel}`);
    assert.ok(css.slice(i, css.indexOf('}', i)).includes(prop), `${sel} lacks ${prop}`);
  }
});
