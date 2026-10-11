import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { t, tp, setLocale } from '../src/locale/locale.js';

const en = JSON.parse(fs.readFileSync(new URL('../src/locale/en.json', import.meta.url), 'utf8'));
const ru = JSON.parse(fs.readFileSync(new URL('../src/locale/ru.json', import.meta.url), 'utf8'));

// Морфология-батч 11.10 (§7 п.1): agoText×3 + SYNC-карта + IN USE + Test Room.
// Паттерн (Ruling): plural-формы — объектами {one,few,many} в ОБЕИХ таблицах,
// рендер — tp(key, n); никаких if (n==1) на call site'ах. RED: ни tp, ни ключей нет.
const NEED = [
  'dfo:save.ago_minutes', 'dfo:save.ago_hours', 'dfo:save.ago_days',
  'dfo:menu.sync_note', 'dfo:menu.sync_go', 'dfo:menu.sync_undo_title',
  'dfo:menu.look_in_use', 'dfo:menu.testroom_offline_only',
];

test('morph batch: EN+RU share the keys', () => {
  for (const k of NEED) {
    const [table, key] = k.split(':');
    assert.ok(en[table]?.[key] !== undefined, 'en has ' + k);
    assert.ok(ru[table]?.[key] !== undefined, 'ru has ' + k);
  }
});

test('morph exact RU values (QA-gated)', () => {
  assert.deepEqual(ru.dfo['save.ago_minutes'], { one: '# минуту назад', few: '# минуты назад', many: '# минут назад' });
  assert.deepEqual(ru.dfo['save.ago_hours'], { one: '# час назад', few: '# часа назад', many: '# часов назад' });
  assert.deepEqual(ru.dfo['save.ago_days'], { one: '# день назад', few: '# дня назад', many: '# дней назад' });
  assert.equal(ru.dfo['menu.look_in_use'], 'Используется');
  assert.equal(ru.dfo['menu.testroom_offline_only'], 'Тестовая комната: только офлайн');
  assert.equal(
    ru.dfo['menu.sync_note'],
    'Играйте офлайн по тем же правилам, что в сети. Часть настроек в сети зафиксирована; эта кнопка подгоняет ваши под них. Они одинаковы на любом сервере, всё остальное — на ваш выбор.',
  );
});

test('tp renders RU plurals 1/2/5/11/21', () => {
  setLocale('ru');
  assert.equal(tp('dfo:save.ago_minutes', 1), '1 минуту назад');
  assert.equal(tp('dfo:save.ago_minutes', 2), '2 минуты назад');
  assert.equal(tp('dfo:save.ago_minutes', 5), '5 минут назад');
  assert.equal(tp('dfo:save.ago_minutes', 11), '11 минут назад');
  assert.equal(tp('dfo:save.ago_minutes', 21), '21 минуту назад');
  assert.equal(tp('dfo:menu.sync_go', 1), 'Синхронизировать 1 настройку');
  assert.equal(tp('dfo:menu.sync_go', 3), 'Синхронизировать 3 настройки');
  assert.equal(tp('dfo:menu.sync_go', 7), 'Синхронизировать 7 настроек');
  assert.equal(tp('dfo:menu.sync_undo_title', 1), 'Возвращает 1 настройку, изменённую последней синхронизацией');
  setLocale('en');
  assert.equal(tp('dfo:save.ago_hours', 2), '2 hours ago');
  assert.equal(tp('dfo:menu.sync_go', 1), 'Sync 1 setting');
  setLocale('en');
});

test('tp missing key: fallback without crash', () => {
  setLocale('ru');
  assert.equal(tp('dfo:no.such_key', 5), 'dfo:no.such_key');
  setLocale('en');
});
