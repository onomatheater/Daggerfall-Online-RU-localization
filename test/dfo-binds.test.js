import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { t, setLocale } from '../src/locale/locale.js';

const en = JSON.parse(fs.readFileSync(new URL('../src/locale/en.json', import.meta.url), 'utf8'));
const ru = JSON.parse(fs.readFileSync(new URL('../src/locale/ru.json', import.meta.url), 'utf8'));

// Batch 2026-10-10: key bindings registry (systems/inputActions.js,
// bind.<ActionId> + bindgrp.<group>) and bindings panes chrome (bindc.).
const ACTIONS = [
  'MoveForwards', 'MoveBackwards', 'MoveLeft', 'MoveRight', 'TurnLeft', 'TurnRight',
  'LookUp', 'LookDown', 'CenterView', 'TogglePerspective', 'Jump', 'Crouch', 'Run',
  'AutoRun', 'Sneak', 'WalkMode', 'FloatUp', 'FloatDown', 'ReadyWeapon', 'SwingWeapon',
  'SwitchHand', 'CastSpell', 'RecastSpell', 'AbortSpell', 'UseMagicItem',
  'ActivateCenterObject', 'Interact', 'ModeWheel', 'StealMode', 'GrabMode',
  'InfoMode', 'TalkMode', 'QuickLootAll', 'QuickLootOpen', 'Transport', 'Rest',
  'Escape', 'CharacterSheet', 'Inventory', 'Status', 'LogBook', 'NoteBook',
  'AutoMap', 'TravelMap', 'QuickDial', 'TravelView', 'QuickUse1', 'QuickUse2',
  'QuickSpell', 'QuickOffHand', 'QuickSwap', 'Hotbar5', 'Hotbar6', 'Hotbar7',
  'Hotbar8', 'Hotbar9', 'Hotbar10', 'ActivateCursor', 'FreeMouse', 'SocialInteract',
  'ActChoice', 'Professions', 'QuickSave', 'QuickLoad', 'PrintScreen', 'DebugOverlay',
  'TorchToggleLight', 'TorchDrop', 'TorchThrow', 'ShoulderSwitch', 'AutoPerspective',
  'FollowPaths', 'HorseMount', 'HorseSummon', 'BoatSailUp', 'BoatSailDown',
  'BoatDisembark', 'BoatToggleLight', 'BoatToggleSail', 'BoatTrimRight', 'BoatTrimLeft',
  'BoatTrimModifier', 'BoatTimeScaleUp', 'BoatTimeScaleDown', 'BoatTimeScaleReset',
  'LegacyFamily',
];
const GROUPS = [
  'Movement', 'Combat', 'Magic', 'Interaction', 'Windows', 'Quickslots and hotbar',
  'Mouse', 'Online', 'Professions', 'Game', 'Handheld Torches', 'Eye of the Beholder',
  'Travel Options', 'Horse Cart and Cargo', 'Come Sail Away', 'Project Legacy',
];
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const NEED = [
  ...ACTIONS.map((a) => 'bind.' + a),
  ...GROUPS.map((g) => 'bindgrp.' + slug(g)),
  'bindc.multi', 'bindc.defaults_ask', 'bindc.confirm_btn', 'bindc.saved',
  'bindc.press_key', 'bindc.clear_binding', 'bindc.default_controls', 'bindc.key_in_use',
  'bindc.transport', 'bindc.static_keys', 'bindc.howto', 'bindc.shared', 'bindc.confirm_hint',
  'bindc.primary', 'bindc.secondary', 'bindc.which_set', 'bindc.defaults',
  'bindc.primary_caps', 'bindc.secondary_caps', 'bindc.press_key_dot', 'bindc.console',
  'bindc.screenshot', 'bindc.none', 'bindc.lowest', 'bindc.highest', 'bindc.vanilla',
  'bindc.look_smoothing', 'bindc.look_sens', 'bindc.swing_mode', 'bindc.invert_y',
  'bindc.move_accel', 'bindc.bow_draw', 'bindc.toggle_sneak', 'bindc.protect',
  'bindc.attack_threshold', 'bindc.adv_controls', 'bindc.continue_caps',
  'bindc.pad_controls', 'bindc.left_click', 'bindc.middle_click', 'bindc.right_click',
  'bindc.move_h', 'bindc.invert', 'bindc.move_v', 'bindc.cam_h', 'bindc.cam_v',
  'bindc.look_sens', 'bindc.look_sens_pad', 'bindc.ui_sens', 'bindc.max_threshold', 'bindc.deadzone',
  'bindc.enable_pad', 'bindc.move_axis',
  'val.full', 'val.half', 'val.quarter', 'val.maximum', 'val.default', 'val.meadow',
  'val.pixel', 'val.smooth', 'val.none', 'val.vanilla', 'val.lowest', 'val.highest',
  'val.ultra', 'val.hq', 'val.invert', 'val.back', 'val.reset', 'val.minimal',
  'val.large', 'val.colour', 'val.monochrome', 'val.primary', 'val.secondary',
];

test('binds batch: EN+RU share all keys, RU non-empty', () => {
  for (const k of NEED) {
    assert.ok(en.dfo?.[k], 'en has ' + k);
    assert.ok(ru.dfo?.[k]?.length > 0, 'ru has ' + k);
  }
});

test('binds exact RU values (QA-gated)', () => {
  const eq = (k, v) => assert.equal(ru.dfo[k], v, k);
  eq('bind.MoveForwards', 'Движение вперёд');
  eq('bind.CastSpell', 'Книга заклинаний');
  eq('bind.QuickSave', 'Быстрое сохранение');
  eq('bindgrp.movement', 'Движение');
  eq('bindc.howto', 'Нажмите назначение, затем нужную клавишу. Подходят все клавиши, включая Escape. Удерживайте Ctrl, Shift или Alt для комбинаций. Правый клик или ✕ очищает назначение.');
  eq('bindc.confirm_hint', 'Ничего не сохранится, пока не нажмёте {confirm}, включая значения по умолчанию. Уйдёте со страницы — изменения сбросятся.');
  eq('val.ultra', 'Ультра');
});

test('binds render in RU', () => {
  setLocale('ru');
  assert.equal(t('dfo:bind.Jump'), 'Прыжок');
  assert.equal(t('dfo:bind.Inventory'), 'Инвентарь');
  setLocale('en');
});
