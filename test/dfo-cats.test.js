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
