import test from 'node:test';
import assert from 'node:assert/strict';
import { t, tp, setLocale } from '../src/locale/locale.js';
import en from '../src/locale/en.json' with { type: 'json' };
import ru from '../src/locale/ru.json' with { type: 'json' };

// NEED: строки 7815-меню, которых не было в старых таблицах.
// Точные EN — байт-в-байт из dfjs@7815, RU — gamer-neutral.

const NEED = [
  'dfo:tier.enhanced_caps', 'dfo:tier.classic_caps', 'dfo:tier.off_caps',
  'dfo:motion.technique', 'dfo:motion.technique_note',
  'dfo:view.draw_distance', 'dfo:view.draw_note',
  'dfo:feat.n_modules', 'dfo:feat.n_dials', 'dfo:feat.n_keys',
  'dfo:tab.n_options',
  'dfo:help.mod_authored', 'dfo:help.keys_note',
];

test('menu-7815-delta: keys exist, EN byte-exact, RU non-empty', () => {
  for (const full of NEED) {
    const [table, key] = full.split(':');
    assert.ok(en[table][key] !== undefined, 'missing EN ' + full);
    assert.ok(typeof ru[table][key] === 'object' || String(ru[table][key]).length > 0, 'missing RU ' + full);
  }
  assert.equal(en.dfo['tier.enhanced_caps'], 'ENHANCED');
  assert.equal(en.dfo['tier.classic_caps'], 'DFU CLASSIC');
  assert.equal(en.dfo['tier.off_caps'], 'OFF');
  assert.equal(en.dfo['motion.technique'], 'Technique camera motion');
});

test('menu-7815-delta: exact RU', () => {
  assert.equal(ru.dfo['tier.enhanced_caps'], 'Улучшенные');
  assert.equal(ru.dfo['tier.classic_caps'], 'Классика DFU');
  assert.equal(ru.dfo['tier.off_caps'], 'Выкл');
  assert.equal(ru.dfo['motion.technique'], 'Движение камеры в приёмах');
  assert.equal(ru.dfo['motion.technique_note'], 'Насколько приём трясёт и наклоняет камеру и качает руки.');
  assert.equal(ru.dfo['view.draw_distance'], 'Дальность прорисовки');
  assert.equal(ru.dfo['help.mod_authored'], 'Автор мода');
  assert.deepEqual(ru.dfo['feat.n_modules'], { one: '# модуль', few: '# модуля', many: '# модулей' });
  assert.deepEqual(ru.dfo['feat.n_dials'], { one: '# регулятор', few: '# регулятора', many: '# регуляторов' });
  assert.deepEqual(ru.dfo['feat.n_keys'], { one: '# клавиша', few: '# клавиши', many: '# клавиш' });
  assert.deepEqual(ru.dfo['tab.n_options'], { one: '# настройка', few: '# настройки', many: '# настроек' });
});

test('menu-7815-delta: renders in RU', () => {
  setLocale('ru');
  assert.equal(t('dfo:tier.enhanced_caps'), 'Улучшенные');
  assert.equal(tp('dfo:feat.n_modules', 1), '1 модуль');
  assert.equal(tp('dfo:feat.n_modules', 3), '3 модуля');
  assert.equal(tp('dfo:feat.n_modules', 7), '7 модулей');
  assert.equal(tp('dfo:feat.n_dials', 2), '2 регулятора');
  assert.equal(tp('dfo:tab.n_options', 25), '25 настроек');
  setLocale('en');
});
