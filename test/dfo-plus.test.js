import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { t, setLocale } from '../src/locale/locale.js';

const en = JSON.parse(fs.readFileSync(new URL('../src/locale/en.json', import.meta.url), 'utf8'));
const ru = JSON.parse(fs.readFileSync(new URL('../src/locale/ru.json', import.meta.url), 'utf8'));

// Plus-card (H2-хвост 11.10): UI Overhaul card на странице Оформления —
// цвета/курсор Enhanced Plus + контроллер-ряды. RED увиден в пробе
// (голые EN-литералы в enhancedMenu.js:3531-3663); все ключи уже в
// таблицах — батч чистого wiring, новых ключей ноль (probe: patch-*.mjs).
const NEED = [
  'menu.enhanced_plus_colour', 'menu.ui_colour',
  'menu.enhanced_plus_cursor', 'menu.cursor', 'menu.gauntlet', 'menu.system',
  'menu.controller_crossbar', 'menu.auto', 'menu.left_stick_run',
  'menu.toggle', 'menu.hold', 'menu.controller_layout',
  'menu.controller_bindings', 'menu.reset_controller_layout',
  'val.on', 'val.off',
];

test('plus batch: EN+RU share the keys, RU non-empty', () => {
  for (const k of NEED) {
    assert.ok(en.dfo?.[k], 'en has ' + k);
    assert.ok(ru.dfo?.[k]?.length > 0, 'ru has ' + k);
  }
  setLocale('en');
});

test('plus exact RU values (QA-gated)', () => {
  const eq = (k, v) => assert.equal(ru.dfo[k], v, k);
  eq('menu.enhanced_plus_colour', 'Цвет Enhanced Plus');
  eq('menu.ui_colour', 'Цвет интерфейса');
  eq('menu.enhanced_plus_cursor', 'Курсор Enhanced Plus');
  eq('menu.cursor', 'Курсор');
  eq('menu.gauntlet', 'Перчатка');
  eq('menu.system', 'Система');
  eq('menu.controller_crossbar', 'Кроссбар геймпада');
  eq('menu.auto', 'Авто');
  eq('menu.left_stick_run', 'Бег левым стиком');
  eq('menu.toggle', 'Переключатель');
  eq('menu.hold', 'Удержание');
  eq('menu.controller_layout', 'Раскладка геймпада');
  eq('menu.controller_bindings', 'Привязки геймпада…');
  eq('menu.reset_controller_layout', 'Сбросить раскладку');
});

test('plus renders in RU', () => {
  setLocale('ru');
  assert.equal(t('dfo:menu.controller_crossbar'), 'Кроссбар геймпада');
  assert.equal(t('dfo:menu.controller_bindings'), 'Привязки геймпада…');
  assert.equal(t('dfo:menu.enhanced_plus_colour'), 'Цвет Enhanced Plus');
  setLocale('en');
});
