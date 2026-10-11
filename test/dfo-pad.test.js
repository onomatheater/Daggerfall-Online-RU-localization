import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { t, setLocale } from '../src/locale/locale.js';

const en = JSON.parse(fs.readFileSync(new URL('../src/locale/en.json', import.meta.url), 'utf8'));
const ru = JSON.parse(fs.readFileSync(new URL('../src/locale/ru.json', import.meta.url), 'utf8'));

// Wave 2 batch 2: gamepad/touch controls — action names, sticks, hints.
// plusPadBinds.js / touchButtons.js. Dev-asserts ("no such row" etc.) excluded.
const NEED = [
  'pad.activate_select', 'pad.attack', 'pad.inventory_back', 'pad.draw_sheathe',
  'pad.recast_spell', 'pad.pause', 'pad.crouch', 'pad.mouselook',
  'pad.overworld', 'pad.move', 'pad.look',
  'pad.tap', 'pad.up', 'pad.down', 'pad.left', 'pad.right',
  'pad.sticks', 'pad.left_stick', 'pad.left_stick.note',
  'pad.right_stick', 'pad.right_stick.note', 'pad.buttons',
  'pad.bindings', 'pad.cancelled', 'pad.bound', 'pad.choose_row',
  'pad.no_button', 'pad.press_button', 'pad.reset_plus',
  'pad.layout_back', 'pad.crouch_sneak', 'pad.interact_use',
];

test('pad batch: EN+RU share the new keys, RU non-empty', () => {
  for (const k of NEED) {
    assert.ok(en.dfo?.[k], 'en has ' + k);
    assert.ok(ru.dfo?.[k]?.length > 0, 'ru has ' + k);
  }
});

test('pad exact RU values (QA-gated)', () => {
  const eq = (k, v) => assert.equal(ru.dfo[k], v, k);
  eq('pad.move', 'Движение');
  eq('pad.look', 'Осмотр');
  eq('pad.attack', 'Атака');
  eq('pad.activate_select', 'Действие / Выбор');
  eq('pad.pause', 'Пауза');
  eq('pad.crouch', 'Присесть');
  eq('pad.overworld', 'Глобальная карта');
  eq('pad.bindings', 'Привязки контроллера');
  eq('pad.cancelled', 'Отменено.');
  eq('pad.bound', 'Привязано.');
  eq('pad.crouch_sneak', 'Присесть и красться');
  eq('pad.interact_use', 'Взаимодействие (клавиша использования)');
  eq('pad.up', 'Вверх');
});

test('pad renders in RU', () => {
  setLocale('ru');
  assert.equal(t('dfo:pad.move'), 'Движение');
  assert.equal(t('dfo:pad.bindings'), 'Привязки контроллера');
  setLocale('en');
});
