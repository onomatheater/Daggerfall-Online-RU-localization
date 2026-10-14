import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { checkYo, checkMixed, checkSpaces, scanValue, scanTables } from '../tools/ru-scan.mjs';

test('yo: еще/ее/щелкн/шел без ё', () => {
  assert.ok(checkYo('еще немного').length > 0);
  assert.ok(checkYo('Еще немного').length > 0);
  assert.ok(checkYo('переместить ее.').length > 0);
  assert.ok(checkYo('Ее дополнения').length > 0);
  assert.ok(checkYo('Щелкните сюда').length > 0);
  assert.ok(checkYo('ушел в отставку').length > 0);
  assert.deepEqual(checkYo('её'), []);
  assert.deepEqual(checkYo('Щёлкните сюда'), []);
  assert.deepEqual(checkYo('всех'), []);
  assert.deepEqual(checkYo('щелчок'), []);
});

test('yo: темн/заем/запрещенн/затемнн без ё (но не затемнять)', () => {
  assert.ok(checkYo('Темный эльф').length > 0);
  assert.ok(checkYo('в темноте').length > 0);
  assert.ok(checkYo('Запрещенный материал').length > 0);
  assert.ok(checkYo('взять заем').length > 0);
  assert.ok(checkYo('затемненность').length > 0);
  assert.deepEqual(checkYo('Тёмный эльф'), []);
  assert.deepEqual(checkYo('Запрещённый материал'), []);
  assert.deepEqual(checkYo('взять заём'), []);
  assert.deepEqual(checkYo('затемнённость экрана'), []);
  assert.deepEqual(checkYo('Затемнение экрана'), []);
  assert.deepEqual(checkYo('Затемняет проход'), []);
});

test('mixed: латиница внутри кириллицы, но не \\r-артефакт', () => {
  assert.ok(checkMixed('Свободa действий', 'Free Action').length > 0);
  assert.ok(checkMixed('Храмовые Mиссионеры', 'Temple Missionaries').length > 0);
  assert.deepEqual(checkMixed('Левый щелчок\\rправый', 'left click\\rright'), []);
  assert.deepEqual(checkMixed('Чистый текст', 'Clean text'), []);
});

test('spaces: края и дубли только как в EN', () => {
  assert.ok(checkSpaces('Введите имя: ', 'Enter name: ').length === 0);
  assert.ok(checkSpaces('Текст ', 'Text').length > 0);
  assert.ok(checkSpaces('of  MB', 'of  MB').length === 0);
  assert.ok(checkSpaces('слово  слово', 'word word').length > 0);
  assert.ok(checkSpaces('Введите имя: ', "'Enter name: '").length === 0, 'RSC-кавычки EN не считаются');
  assert.ok(checkSpaces('Куда: ', "'Where:'").length === 0, 'промпт с полем ввода');
});

test('scanValue aggregates', () => {
  assert.deepEqual(scanValue('Чисто', 'Clean'), []);
  assert.ok(scanValue('ее  слово', 'hers word').length >= 2);
});

test('scanTables descends into plural-form objects', () => {
  const en = { dfo: { 'save.ago_x': { one: '# minute ago', few: '# minutes ago', many: '# minutes ago' } } };
  const ru = { dfo: { 'save.ago_x': { one: '# минуту назад', few: '# минуты назад', many: '# минут назад' } } };
  assert.deepEqual(scanTables(en, ru), []);
  const bad = { dfo: { 'save.ago_x': { one: '# минуту назад', few: 'ее минуты назад', many: '# минут назад' } } };
  assert.ok(scanTables(en, bad).length === 1, 'object leaf with ее must fail');
});

test('guard: all shipped tables scan clean', () => {
  const en = JSON.parse(fs.readFileSync(new URL('../src/locale/en.json', import.meta.url), 'utf8'));
  const ru = JSON.parse(fs.readFileSync(new URL('../src/locale/ru.json', import.meta.url), 'utf8'));
  // Намеренные расхождения (ревью-очередь скилла, не дефекты):
  // - comma / exteriorAutomapToolTipRotateLeftButton: двойной пробел — артефакт EN, в RU нормализован;
  // - serviceSummonCost1 / loanReminder / cannotLoiterMoreThanXHours1: головы конкатенаций,
  //   пробел-клей в RU в конце части, в EN — в начале следующей (конвенция RSC).
  const ALLOW = new Set([
    'strings:comma',
    'strings:exteriorAutomapToolTipRotateLeftButton',
    'strings:serviceSummonCost1',
    'strings:loanReminder',
    'strings:cannotLoiterMoreThanXHours1',
  ]);
  const bad = scanTables(en, ru).filter((r) => !ALLOW.has(`${r.table}:${r.key}`));
  assert.deepEqual(bad, []);
});

// ALLOW выше — не слепое пятно: ожидаемые значения запечены, тихая
// правка любого из пяти ключей уронит этот тест (править парой с ассёртом).
test('guard: ALLOW-listed values are pinned', () => {
  const en = JSON.parse(fs.readFileSync(new URL('../src/locale/en.json', import.meta.url), 'utf8'));
  const ru = JSON.parse(fs.readFileSync(new URL('../src/locale/ru.json', import.meta.url), 'utf8'));
  assert.equal(ru.strings.comma, ', ');
  assert.equal(ru.strings.exteriorAutomapToolTipRotateLeftButton, 'Щелчок левой кнопкой мыши: поворот карты влево (горячая клавиша: {0})\\r Щелчок правой кнопкой мыши: поворот карты вокруг позиции игрока\\r влево (горячая клавиша: {1})');
  assert.equal(ru.strings.serviceSummonCost1, '%pcn, плата за мою попытку ');
  assert.equal(ru.strings.loanReminder, 'У вас есть заём в размере {0} золотых монет, подлежащий выплате ');
  assert.equal(ru.strings.cannotLoiterMoreThanXHours1, 'Вы не можете бездельничать больше ');
});
