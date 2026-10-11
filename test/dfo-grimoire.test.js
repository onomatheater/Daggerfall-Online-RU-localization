import test from 'node:test';
import assert from 'node:assert/strict';
import { t, setLocale } from '../src/locale/locale.js';
import en from '../src/locale/en.json' with { type: 'json' };
import ru from '../src/locale/ru.json' with { type: 'json' };

// NEED: лейблы и опции карточки DFO Grimoire (menu-cover 3 hard-MISS
// Pages/Backdrop/Vitals + 8 опций из grimoireDress.js ванили 7815).
// Точные EN — байт-в-байт из dfjs, RU — по слову человека 11.10.

const NEED = [
  'dfo:grim.pages', 'dfo:grim.backdrop', 'dfo:grim.vitals',
  'dfo:grim.page.cream', 'dfo:grim.page.scroll',
  'dfo:grim.backdrop.desk', 'dfo:grim.backdrop.map',
  'dfo:grim.vitals.upright', 'dfo:grim.vitals.row',
  'dfo:grim.spellbook.book', 'dfo:grim.spellbook.pack',
];

test('grimoire: keys exist, EN byte-exact, RU non-empty', () => {
  for (const full of NEED) {
    const [table, key] = full.split(':');
    assert.ok(en[table][key] !== undefined, 'missing EN ' + full);
    assert.ok(String(ru[table][key]).length > 0, 'missing RU ' + full);
  }
  assert.equal(en.dfo['grim.pages'], 'Pages');
  assert.equal(en.dfo['grim.backdrop'], 'Backdrop');
  assert.equal(en.dfo['grim.vitals'], 'Vitals');
  assert.equal(en.dfo['grim.page.cream'], 'Cream page');
  assert.equal(en.dfo['grim.page.scroll'], 'Tan scroll');
  assert.equal(en.dfo['grim.backdrop.desk'], 'The desk');
  assert.equal(en.dfo['grim.backdrop.map'], 'The map');
  assert.equal(en.dfo['grim.vitals.upright'], 'Upright vials');
  assert.equal(en.dfo['grim.vitals.row'], 'Vials in a row');
  assert.equal(en.dfo['grim.spellbook.book'], 'DFO book');
  assert.equal(en.dfo['grim.spellbook.pack'], "GrimoireUI's own");
});

test('grimoire: exact RU', () => {
  assert.equal(ru.dfo['grim.pages'], 'Страницы');
  assert.equal(ru.dfo['grim.backdrop'], 'Фон');
  assert.equal(ru.dfo['grim.vitals'], 'Показатели');
  assert.equal(ru.dfo['grim.page.cream'], 'Кремовая страница');
  assert.equal(ru.dfo['grim.page.scroll'], 'Свитковая страница');
  assert.equal(ru.dfo['grim.backdrop.desk'], 'Письменный стол');
  assert.equal(ru.dfo['grim.backdrop.map'], 'Карта');
  assert.equal(ru.dfo['grim.vitals.upright'], 'Вертикальные фиалы');
  assert.equal(ru.dfo['grim.vitals.row'], 'Фиалы в ряд');
  assert.equal(ru.dfo['grim.spellbook.book'], 'Книга DFO');
  assert.equal(ru.dfo['grim.spellbook.pack'], 'Собственная GrimoireUI');
});

test('grimoire: renders in RU', () => {
  setLocale('ru');
  assert.equal(t('dfo:grim.pages'), 'Страницы');
  assert.equal(t('dfo:grim.backdrop.desk'), 'Письменный стол');
  assert.equal(t('dfo:grim.spellbook.pack'), 'Собственная GrimoireUI');
  setLocale('en');
});
