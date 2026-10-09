import test from 'node:test';
import assert from 'node:assert/strict';
import { tOr, setLocale } from '../src/locale/locale.js';

const CATS = {
  game: 'Игра',
  controls: 'Управление',
  audio: 'Звук',
  video: 'Видео',
  interface: 'Интерфейс',
  accessibility: 'Доступность',
  mods: 'Данные и моды',
};

test('dfo categories + blurbs RU/EN', () => {
  setLocale('ru');
  for (const [id, ru] of Object.entries(CATS)) assert.equal(tOr(`dfo:cat.${id}`, id), ru, id);
  assert.ok(tOr('dfo:catblurb.interface', '').length > 20, 'blurb translated');
  setLocale('en');
  assert.equal(tOr('dfo:cat.interface', 'Interface'), 'Interface');
  assert.ok(tOr('dfo:catblurb.interface', 'x').length > 20, 'blurb EN present');
});

test('dfo reset dialog + revised seeds read naturally', () => {
  setLocale('ru');
  assert.equal(tOr('dfo:reset.title', 'Reset Everything'), 'Сбросить всё');
  assert.equal(tOr('dfo:reset.confirm', 'Reset'), 'Сбросить');
  assert.equal(tOr('dfo:settings.MeleeAttacks/MeleeAttackFriendlyProtection', 'x'), 'Не задевать прохожих');
  assert.equal(tOr('dfo:settings.Enhancements/LoiterLimitInHours', 'x'), 'Предел ожидания');
  assert.equal(tOr('dfo:settings.Controls/InstantRepairs', 'x'), 'Чинить сразу');
  assert.equal(tOr('dfo:settings.GUI/QuestRumorWeight', 'x'), 'Частота слухов');
  setLocale('en');
});
