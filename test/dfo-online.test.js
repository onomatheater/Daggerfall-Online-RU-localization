import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { t, setLocale } from '../src/locale/locale.js';

const en = JSON.parse(fs.readFileSync(new URL('../src/locale/en.json', import.meta.url), 'utf8'));
const ru = JSON.parse(fs.readFileSync(new URL('../src/locale/ru.json', import.meta.url), 'utf8'));

// Wave 2 batch 3: online rail pane — explainer halves (split around the
// runtime skyDayWords() call) + bring-offline heading. Everything else on
// the pane already has keys (menu.* flow) and only needs probe wiring.
// NEED (wiring batch 11.10, RED увиден в DOM-PROBE: online-open показал
// голые EN-литералы): empty() и undo/copy-диалоги в enhancedMenu.js
// вяжутся ТОЛЬКО на эти ключи, новых не заводим (probe: patch-*.mjs).
const NEED = [
  'online.explainer_shared', 'online.explainer_clock', 'online.bring_offline_once',
  'menu.no_saved_games', 'menu.an_offline_character_the_realm_knew_before_it_op',
  'menu.sign_in_or_continue_as_guest', 'menu.bring_online', 'menu.undo',
  'realm.undo_ask', 'realm.undo_body', 'realm.undo_done', 'realm.copy_done',
  'realm.undo_button', 'menu.online_needs_an_account_so_no_one_else_can_use_y',
];

test('online batch: EN+RU share the new keys, RU non-empty', () => {
  for (const k of NEED) {
    assert.ok(en.dfo?.[k], 'en has ' + k);
    assert.ok(ru.dfo?.[k]?.length > 0, 'ru has ' + k);
  }
});

test('online exact RU values (QA-gated)', () => {
  const eq = (k, v) => assert.equal(ru.dfo[k], v, k);
  eq('online.bring_offline_once', 'Привести офлайн-персонажа (однократно)');
  eq('online.explainer_shared', 'Каждый играет в своё сохранение: вы видите друг друга и общаетесь где угодно. Привал капера, где начинается каждый персонаж, — у каждого свой. Подземелья и здания общие: враги, двери, рычаги и каждый открытый сундук, полка или шкаф — одни для всех, и навсегда. В городах и диких землях вы делите окружающих: кого встретит один игрок, видят и могут бить все рядом, и эти твари могут ранить и вас.');
});

test('online renders in RU', () => {
  setLocale('ru');
  assert.equal(t('dfo:online.bring_offline_once'), 'Привести офлайн-персонажа (однократно)');
  assert.equal(t('dfo:menu.no_saved_games'), 'Сохранений нет');
  assert.equal(
    t('dfo:menu.an_offline_character_the_realm_knew_before_it_op'),
    'Персонажа, которого мир знал до открытия, можно ввести отсюда один раз.',
  );
  assert.equal(t('dfo:realm.undo_ask', { name: 'Тест' }), 'Отменить перенос Тест в мир?');
  assert.equal(t('dfo:realm.undo_button'), 'Отменить перенос');
  assert.equal(t('dfo:menu.undo'), 'Отменить');
  assert.equal(t('dfo:menu.bring_online'), 'Ввести в мир');
  assert.equal(
    t('dfo:menu.online_needs_an_account_so_no_one_else_can_use_y'),
    'Для сетевой игры нужна учётная запись, чтобы имя не заняли. Гостем — один клик и без почты.',
  );
  assert.equal(t('dfo:menu.sign_in_or_continue_as_guest'), 'Войти или продолжить гостем');
  setLocale('en');
});
