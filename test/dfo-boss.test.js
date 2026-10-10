import test from 'node:test';
import assert from 'node:assert/strict';
import { setLocale, t } from '../src/locale/locale.js';

// BOSS_COUNT_FELL_TEXT (7553, world.js): нотис смерти в босс-файте.
// Вне меню, но тот же контракт: ID внутри, текст на рендере.
test('boss.count_fell exact EN+RU, no placeholders', () => {
  setLocale('en');
  assert.equal(t('dfo:boss.count_fell'), 'The fight counts you fallen.');
  setLocale('ru');
  assert.equal(t('dfo:boss.count_fell'), 'Бой засчитал ваше падение.');
  setLocale('en');
});
