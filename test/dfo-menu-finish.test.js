import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { t, setLocale } from '../src/locale/locale.js';

const en = JSON.parse(fs.readFileSync(new URL('../src/locale/en.json', import.meta.url), 'utf8'));
const ru = JSON.parse(fs.readFileSync(new URL('../src/locale/ru.json', import.meta.url), 'utf8'));

// Batch 2026-10-09: main-menu screens up to (not including) character
// creation — save/load dialogs, online account flow, shared dialog hints,
// settings tier statuses + retro tip, settings rows added upstream.
const NEED = [
  'save.no_saves_classic', 'save.enter_name', 'save.select_save', 'save.rename',
  'save.delete', 'save.switch_char', 'save.please_wait', 'save.overwrite_confirm',
  'save.delete_confirm', 'save.need_name', 'save.need_select',
  'account.username', 'account.username_hint', 'account.password', 'account.repeat_password',
  'account.current_password', 'account.recovery_code', 'account.recovery_hint',
  'account.tos', 'account.privacy', 'account.passwords_mismatch', 'account.username_rule',
  'account.type_recovery', 'account.type_password', 'account.type_username',
  'account.agree_tos', 'account.agree_privacy', 'account.patreon_finish',
  'account.patreon_linked_title', 'account.patreon_linked_wait', 'account.patreon_unlinked',
  'account.wearing_title', 'account.title_removed', 'account.glyph_shown',
  'account.glyph_hidden', 'account.aura_removed', 'account.password_changed',
  'account.signed_out_everywhere', 'account.signed_out',
  'dlg.ok', 'dlg.enter_or_o_close', 'dlg.enter_ok', 'dlg.y_yes', 'dlg.n_no',
  'dlg.enter_accept', 'dlg.key_enter', 'dlg.key_escape', 'dlg.key_space',
  'dlg.key_backspace', 'dlg.return_ok',
  'tier.live', 'tier.restart', 'tier.saved', 'tier.fixed',
  'tip.Video/RetroRenderingMode',
  'menu.delete_backup_arm', 'menu.quality_preset', 'menu.quality_preset_note',
  'menu.preset_custom', 'menu.open_overhauls', 'menu.hud_elements_note',
  'menu.bars_split', 'menu.bars_joined', 'menu.controller_cursor_note',
  'menu.drag_turns_note', 'menu.thumb_lands', 'menu.tilt_aim_note', 'menu.press_buzz',
  'menu.corner_buttons', 'menu.touch_fullscreen', 'menu.blades_compass', 'menu.plain_bar',
  'menu.fps_corner', 'menu.morrowind_note', 'menu.mw_players_simple', 'menu.hear_swings',
  'menu.hear_steps', 'menu.court_count', 'menu.stranger_spells', 'menu.rest_party',
  'menu.show_travellers', 'menu.night_clear', 'menu.near_graves',
  'menu.delete_button', 'dlg.y_n_no',
];

test('menu-finish batch: EN+RU share the new keys, RU non-empty', () => {
  for (const k of NEED) {
    assert.ok(en.dfo?.[k], 'en has ' + k);
    assert.ok(ru.dfo?.[k]?.length > 0, 'ru has ' + k);
  }
});

test('menu-finish exact RU values (QA-gated)', () => {
  const eq = (k, v) => assert.equal(ru.dfo[k], v, k);
  eq('save.no_saves_classic', 'Сохранений не найдено. Загрузить классическое сохранение?');
  eq('save.switch_char', 'Сменить персонажа');
  eq('save.overwrite_confirm', 'Перезаписать это сохранение?');
  eq('account.username_hint', 'Одно слово, 3–24 символа, начинается с буквы.');
  eq('account.wearing_title', 'Выбран титул: {title}.');
  eq('account.patreon_linked_title', 'Patreon привязан. Титул выбирается в разделе Title.');
  eq('dlg.ok', 'ОК');
  eq('dlg.y_yes', 'Y — да');
  eq('dlg.enter_accept', 'Enter — принять · Escape — отмена');
  eq('tier.restart', 'Вступит в силу при следующем запуске.');
  eq('menu.delete_backup_arm', 'Удалить копию');
  eq('menu.court_count', 'Сколько игроков рисует Горящий двор. Ваш отряд виден всегда.');
  eq('menu.quality_preset_note', 'Дальность вида, трава, облака, чёткость земли и вода.');
  eq('menu.delete_button', 'Удалить');
  eq('dlg.y_n_no', 'Y — да   N — нет');
});

test('menu-finish renders in RU', () => {
  setLocale('ru');
  assert.equal(t('dfo:save.rename'), 'Переименовать');
  assert.equal(t('dfo:account.password'), 'Пароль');
  assert.equal(t('dfo:dlg.ok'), 'ОК');
  assert.equal(t('dfo:menu.preset_custom'), 'Свой');
  setLocale('en');
});
