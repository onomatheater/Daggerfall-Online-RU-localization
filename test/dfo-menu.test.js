import test from 'node:test';
import assert from 'node:assert/strict';
import { t, setLocale } from '../src/locale/locale.js';

// Собственный неймспейс игры (dfo:): строк нет в DFU-мастерах
// (Online, Test Room, Overhauls — придуманы здесь). EN обязан совпадать
// с литералами клиента байт в байт — иначе поплывут роутинг idOf()
// и CSS-классы door-<id>, которые считаются из EN-лейбла.
const EN = {
  'menu.continue': 'Continue',
  'menu.newGame': 'New Game',
  'menu.loadGame': 'Load Game',
  'menu.online': 'Online',
  'menu.testRoom': 'Test Room',
  'menu.settings': 'Settings',
  'menu.features': 'Features',
  'menu.overhauls': 'Overhauls',
  'menu.screenshots': 'Screenshots',
  'menu.about': 'About',
  'menu.resume': 'Resume',
  'menu.saveGame': 'Save Game',
  'menu.begin': 'Begin',
};

test('dfo table: EN byte-identical to client literals', () => {
  setLocale('en');
  for (const [k, v] of Object.entries(EN)) assert.equal(t(`dfo:${k}`), v, k);
});

test('dfo table: RU covers every key, no empties', () => {
  setLocale('ru');
  for (const k of Object.keys(EN)) {
    const s = t(`dfo:${k}`);
    assert.ok(s && s !== `dfo:${k}` && s.length > 0, k);
  }
  setLocale('en');
});

test('dfo table: routing ids derive from EN only', () => {
  const idOf = (label) => label.toLowerCase().split(' ')[0];
  setLocale('en');
  assert.equal(idOf(t('dfo:menu.newGame')), 'new');
  setLocale('ru');
  assert.notEqual(idOf(t('dfo:menu.newGame')), 'new', 'RU label must never feed routing');
  setLocale('en');
});
