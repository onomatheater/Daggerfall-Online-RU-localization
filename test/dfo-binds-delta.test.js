import test from 'node:test';
import assert from 'node:assert/strict';
import { t, setLocale } from '../src/locale/locale.js';
import en from '../src/locale/en.json' with { type: 'json' };
import ru from '../src/locale/ru.json' with { type: 'json' };

// NEED: binds-панель 7815 — тексты мимо старых таблиц.

test('binds-delta: EN byte-exact + RU', () => {
  assert.equal(en.dfo['bindc.intro_law'], 'Nothing is saved until you press Confirm. A key not saved yet is marked on its row.');
  assert.equal(en.dfo['bindc.intro_warn'], 'Nothing is saved until you press Confirm, Defaults included. Leave this page and your changes are dropped.');
  assert.equal(en.dfo['bindc.unsaved_row'], 'Not saved yet - press Confirm.');
  assert.equal(en.dfo['bindc.fixed_note'], 'Fixed keys, listed so you know them: they cannot be rebound here.');
  assert.equal(en.dfo['menu.hotbar'], 'Hotbar');
  assert.equal(ru.dfo['bindc.intro_law'], 'Пока не нажата кнопка «Подтвердить», ничего не сохраняется. Несохранённая клавиша помечена в своей строке.');
  assert.equal(ru.dfo['bindc.intro_warn'], 'Пока не нажата кнопка «Подтвердить» (включая «По умолчанию»), ничего не сохраняется. Уйдёшь со страницы — изменения сбросятся.');
  assert.equal(ru.dfo['bindc.unsaved_row'], 'Пока не сохранено — нажми «Подтвердить».');
  assert.equal(ru.dfo['bindc.fixed_note'], 'Несдвигаемые клавиши — для сведения: переназначить их здесь нельзя.');
  assert.equal(ru.dfo['menu.hotbar'], 'Хотбар');
  setLocale('ru');
  assert.equal(t('dfo:menu.hotbar'), 'Хотбар');
  setLocale('en');
});
