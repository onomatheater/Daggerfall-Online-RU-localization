import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { t, setLocale } from '../src/locale/locale.js';

const en = JSON.parse(fs.readFileSync(new URL('../src/locale/en.json', import.meta.url), 'utf8'));
const ru = JSON.parse(fs.readFileSync(new URL('../src/locale/ru.json', import.meta.url), 'utf8'));

// Batch 2026-10-10 (plan docs/superpowers/plans/2026-10-10-menu-remainder-features.md,
// Task 1): menu remainder — screenshots pane (shotsPane.js), save-tile backup
// states (saveTile.js), pause modal (pauseWindow.js), enhancedMenu tail.
// Ruling: 33 keys, not 37 — recount of extractor misses showed 15+8+2+8.
// Ruling 2026-10-10 (context probe): extractor slugs ≠ upstream keys.
// - menu.controller_cursor_note / hear_swings / hear_steps / show_travellers:
//   upstream already calls ruTOr with these exact keys (enhancedMenu.js
//   2477/2721/2722/2735) — no new keys; EN-sync only ('/’ + trailing space).
// - 'Modules.' (3344) is key.slice() prefix, 'quality/key-bindings/packs'
//   lines (1632-1636) are itemText() search-index — code, not display text.
// New keys are only the plain display literals: 15 shots + 8 save + 2 dlg + 3 menu.
const NEED = [
  'shots.hint_loading', 'shots.under_enhanced', 'shots.reading', 'shots.no_key',
  'shots.add', 'shots.empty', 'shots.bind_hint', 'shots.one', 'shots.on_loading',
  'shots.not_on_loading', 'shots.delete_confirm', 'shots.single', 'shots.all',
  'shots.newer', 'shots.older',
  'save.just_now', 'save.not_backed_up', 'save.backed_up', 'save.backing_up',
  'save.backup_failed', 'save.not_backed_up_yet', 'save.only_in_backup',
  'save.newer_backup',
  'dlg.controls_need_art', 'dlg.quit_confirm',
  'menu.overhauls_blurb', 'menu.modules', 'menu.skills_back',
  'menu.activate_master_skills_confirm',
  // keyed upstream already, pinned against EN-sync regressions:
  'menu.controller_cursor_note', 'menu.hear_swings', 'menu.hear_steps',
  'menu.show_travellers', 'menu.show_travellers_tail',
];

test('menu-rest batch: EN+RU share the new keys, RU non-empty', () => {
  for (const k of NEED) {
    assert.ok(en.dfo?.[k], 'en has ' + k);
    assert.ok(ru.dfo?.[k]?.length > 0, 'ru has ' + k);
  }
});

test('menu-rest exact RU values (QA-gated)', () => {
  const eq = (k, v) => assert.equal(ru.dfo[k], v, k);
  eq('shots.empty', 'Нет снимков');
  eq('shots.single', 'Снимок экрана');
  eq('shots.newer', 'Новее');
  eq('shots.older', 'Старше');
  eq('save.just_now', 'только что');
  eq('save.backed_up', 'Есть копия');
  eq('save.backup_failed', 'Не удалось скопировать');
  eq('dlg.quit_confirm', 'Точно выйти из игры?');
  eq('menu.modules', 'Модули');
  eq('menu.activate_master_skills_confirm', 'Включить мастерские навыки?');
  eq('menu.hear_swings', 'Слышать взмахи оружия других игроков.');
  eq('menu.show_travellers', 'На улице игроки вашей области видят вас на карте. ');
  eq('menu.show_travellers_tail', 'Из помещений не передаётся ничего, кроме группы. Хранится на этом устройстве.');
});

test('menu-rest renders in RU', () => {
  setLocale('ru');
  assert.equal(t('dfo:shots.empty'), 'Нет снимков');
  assert.equal(t('dfo:save.just_now'), 'только что');
  assert.equal(t('dfo:dlg.quit_confirm'), 'Точно выйти из игры?');
  assert.equal(t('dfo:menu.modules'), 'Модули');
  setLocale('en');
});
