import test from 'node:test';
import assert from 'node:assert/strict';
import { t, setLocale } from '../src/locale/locale.js';
import en from '../src/locale/en.json' with { type: 'json' };
import ru from '../src/locale/ru.json' with { type: 'json' };

// NEED: подписи fixed-рядов экрана Controls (FIXED_KEY_ROWS + TRANSPORT_KEY_ROWS
// из controlsConfig.js + 1 непокрытый лейбл WeaponTechnique). Рисуются сырыми
// (fixedKeysCard без словаря) — жалоба человека 11.10: игрок должен понимать
// клавиши без знания английского.

const NEED = [
  'dfo:bind.fixed.hud_large', 'dfo:bind.fixed.hud_toggle', 'dfo:bind.fixed.retro_pp',
  'dfo:bind.fixed.transport_foot', 'dfo:bind.fixed.transport_horse',
  'dfo:bind.fixed.transport_cart', 'dfo:bind.fixed.transport_ship',
  'dfo:bind.fixed.transport_unbound', 'dfo:bind.fixed.transport_then',
  'dfo:bind.WeaponTechnique',
];

test('binds-fixed: keys exist, EN byte-exact, RU non-empty', () => {
  assert.equal(NEED.length, 10);
  for (const full of NEED) {
    const [table, key] = full.split(':');
    assert.ok(en[table][key] !== undefined, 'missing EN ' + full);
    assert.ok(String(ru[table][key]).length > 0, 'missing RU ' + full);
  }
  assert.equal(en.dfo['bind.fixed.hud_large'], 'Large HUD on or off');
  assert.equal(en.dfo['bind.fixed.hud_toggle'], 'Hide or show the HUD');
  assert.equal(en.dfo['bind.fixed.retro_pp'], 'Retro Mode\u2019s post-processing on or off');
  assert.equal(en.dfo['bind.fixed.transport_foot'], 'Transport: go on foot');
  assert.equal(en.dfo['bind.fixed.transport_horse'], 'Transport: ride your horse');
  assert.equal(en.dfo['bind.fixed.transport_cart'], 'Transport: drive your cart');
  assert.equal(en.dfo['bind.fixed.transport_ship'], 'Transport: sail your ship');
  assert.equal(en.dfo['bind.fixed.transport_unbound'], 'Transport (unbound)');
  assert.equal(en.dfo['bind.fixed.transport_then'], '{opener}, then {key}');
  assert.equal(en.dfo['bind.WeaponTechnique'], 'Weapon technique (hold to aim)');
});

test('binds-fixed: exact RU', () => {
  assert.equal(ru.dfo['bind.fixed.hud_large'], 'Крупный интерфейс: вкл. или выкл.');
  assert.equal(ru.dfo['bind.fixed.hud_toggle'], 'Скрыть или показать интерфейс');
  assert.equal(ru.dfo['bind.fixed.retro_pp'], 'Постобработка Ретро-режима: вкл. или выкл.');
  assert.equal(ru.dfo['bind.fixed.transport_foot'], 'Транспорт: идти пешком');
  assert.equal(ru.dfo['bind.fixed.transport_horse'], 'Транспорт: ехать верхом');
  assert.equal(ru.dfo['bind.fixed.transport_cart'], 'Транспорт: ехать в повозке');
  assert.equal(ru.dfo['bind.fixed.transport_ship'], 'Транспорт: плыть на корабле');
  assert.equal(ru.dfo['bind.fixed.transport_unbound'], 'Транспорт (не привязан)');
  assert.equal(ru.dfo['bind.fixed.transport_then'], '{opener}, затем {key}');
  assert.equal(ru.dfo['bind.WeaponTechnique'], 'Приём с оружием (удержание для прицеливания)');
});

test('binds-fixed: renders in RU', () => {
  setLocale('ru');
  assert.equal(t('dfo:bind.fixed.transport_horse'), 'Транспорт: ехать верхом');
  assert.equal(t('dfo:bind.fixed.transport_then', { opener: 'T', key: 'H' }), 'T, затем H');
  setLocale('en');
  assert.equal(t('dfo:bind.fixed.transport_then', { opener: 'T', key: 'H' }), 'T, then H');
});
