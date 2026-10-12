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

test('wire-check: nested call inside params keeps top-level names only', () => {
  const tables = {
    en: { dfo: { 'shots.download_line': 'Also save each shot as a file: {state}' } },
    ru: { dfo: { 'shots.download_line': 'Также сохранять каждый снимок файлом: {state}' } },
  };
  const src = IMP + `x(ruTOr('dfo:shots.download_line', 'Also save each shot as a file: {state}', { state: ruTOr(dl ? 'dfo:val.on' : 'dfo:val.off', dl ? 'On' : 'Off') }));`;
  assert.deepEqual(checkWiring([{ name: 'a.js', src }], tables).errors, []);
});

test('wire-check: %s parity with params count (swing lesson)', () => {
  const tables = {
    en: { dfo: { 'bindc.swing_press': 'Press %s to swing.' } },
    ru: { dfo: { 'bindc.swing_press': 'Нажми %s для взмаха.' } },
  };
  const ok = IMP + `x(ruT('dfo:bindc.swing_press', 'Press %s to swing.', { s: btn }));`;
  assert.deepEqual(checkWiring([{ name: 'a.js', src: ok }], tables).errors, []);
  const badCount = IMP + `x(ruT('dfo:bindc.swing_press', 'Press %s to swing.', { s: btn, extra: 1 }));`;
  const e1 = checkWiring([{ name: 'a.js', src: badCount }], tables).errors;
  assert.equal(e1.length, 1);
  assert.match(e1[0], /placeholder/);
  const badTable = {
    en: { dfo: { 'bindc.swing_press': 'Press to swing.' } },
    ru: { dfo: { 'bindc.swing_press': 'Нажми для взмаха.' } },
  };
  const e2 = checkWiring([{ name: 'a.js', src: ok }], badTable).errors;
  assert.equal(e2.length, 2);
  assert.ok(e2.some((e) => /placeholder/.test(e)));
});

test('wire-check: template default resolves module consts (confirm lesson)', () => {
  const tables = {
    en: { dfo: { 'bindc.intro_law': 'Nothing until you press Confirm.' } },
    ru: { dfo: { 'bindc.intro_law': 'Ничего, пока не нажмёшь Подтвердить.' } },
  };
  const src = IMP + `const CONFIRM_LABEL = 'Confirm';\n` +
    `x(ruTOr('dfo:bindc.intro_law', \`Nothing until you press \${CONFIRM_LABEL}.\`));`;
  assert.deepEqual(checkWiring([{ name: 'a.js', src }], tables).errors, []);
  const srcUnknown = IMP +
    `x(ruTOr('dfo:bindc.intro_law', \`Nothing until you press \${mystery()}.\`));`;
  const e = checkWiring([{ name: 'a.js', src: srcUnknown }], tables).errors;
  assert.equal(e.length, 1);
  assert.match(e[0], /stale default/);
});
