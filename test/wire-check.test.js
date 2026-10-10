import test from 'node:test';
import assert from 'node:assert/strict';
import { checkWiring } from '../tools/wire-check.mjs';

// Статический верификатор wiring'а: call-site'ы ruTOr/tOr в дереве против
// таблиц. Ловит без запуска игры: несуществующие ключи, протухшие дефолты,
// рассинхрон плейсхолдеров. Фикстуры инлайн — без зависимости от tmp/dfjs.
const TABLES = {
  en: { dfo: { 'menu.ok': 'OK', 'menu.enter_as': 'Enter as the {label}', 'menu.old': 'Old text' } },
  ru: { dfo: { 'menu.ok': 'ОК', 'menu.enter_as': 'Войти как {label}', 'menu.old': 'Старый текст' } },
};

const IMP = `import { tOr as ruTOr, t as ruT } from '../locale/locale.js';\n`;

test('wire-check: clean site passes', () => {
  const src = IMP + `label: ruTOr('dfo:menu.ok', "OK"),\n` +
    `t(ruTOr('dfo:menu.enter_as', 'Enter as the {label}', { label: p.label }))`;
  assert.deepEqual(checkWiring([{ name: 'a.js', src }], TABLES).errors, []);
});

test('wire-check: missing key is an error', () => {
  const src = IMP + `x(ruTOr('dfo:menu.nope', 'Nope'));`;
  const { errors } = checkWiring([{ name: 'a.js', src }], TABLES);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /dfo:menu\.nope/);
  assert.match(errors[0], /missing key/);
});

test('wire-check: stale EN default is an error (byte parity)', () => {
  const src = IMP + `x(ruTOr('dfo:menu.old', 'Brand new text'));`;
  const { errors } = checkWiring([{ name: 'a.js', src }], TABLES);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /stale default/);
});

test('wire-check: placeholder mismatch is an error', () => {
  const src = IMP + `x(ruTOr('dfo:menu.enter_as', 'Enter as the {label}', { name: p.label }));`;
  const { errors } = checkWiring([{ name: 'a.js', src }], TABLES);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /placeholder/);
});

test('wire-check: missing RU value is an error', () => {
  const tables = { en: TABLES.en, ru: { dfo: {} } };
  const src = IMP + `x(ruTOr('dfo:menu.ok', 'OK'));`;
  const { errors } = checkWiring([{ name: 'a.js', src }], tables);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /missing RU/);
});

test('wire-check: dynamic key is a warning, not an error', () => {
  const src = IMP + `x(ruTOr('dfo:' + name, fallback));`;
  const r = checkWiring([{ name: 'a.js', src }], TABLES);
  assert.equal(r.errors.length, 0);
  assert.equal(r.warnings.length, 1);
  assert.match(r.warnings[0], /dynamic/);
});

test('wire-check: undefined default is an error (tail2 lesson)', () => {
  const src = IMP + `x(ruTOr('dfo:menu.ok', undefined));`;
  const { errors } = checkWiring([{ name: 'a.js', src }], TABLES);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /undefined default/);
});

test('wire-check: t() with dfo key is checked too', () => {
  const src = IMP + `say(ruT('cannotSaveNow'));`;
  const tables = { en: { strings: { cannotSaveNow: 'You cannot save now.' } }, ru: { strings: {} } };
  const { errors } = checkWiring([{ name: 'w.js', src }], tables);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /missing RU/);
});

test('wire-check: files without locale import are skipped (aetheric lesson)', () => {
  const src = `brass('x', 'Armor', 107, [t('armor'), t('stat', 'intelligence')]);`;
  const r = checkWiring([{ name: 'sys.js', src }], TABLES);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
});
