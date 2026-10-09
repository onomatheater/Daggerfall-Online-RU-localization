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
