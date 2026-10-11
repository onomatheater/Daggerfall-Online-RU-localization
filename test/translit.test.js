import test from 'node:test';
import assert from 'node:assert/strict';
import { translitPart } from '../src/locale/translit.js';

// NEED: транслитерация слогов NameGen (DFU MIT) на рендере.
// RNG и индексы не трогаем — только побуквенная передача EN-слога в кириллицу.
// Точные значения ниже — спека; сгенерированы правилами translit-rules (tmp), заморожены.
test('translit: basic syllables', () => {
  assert.equal(translitPart('Ash'), 'Аш');
  assert.equal(translitPart('Bal'), 'Бал');
  assert.equal(translitPart('bar'), 'бар');
});

test('translit: digraphs', () => {
  assert.equal(translitPart('Ath'), 'Ат');
  assert.equal(translitPart('Aph'), 'Аф');
  assert.equal(translitPart('Chryst'), 'Христ');
  assert.equal(translitPart('Kh'), 'Х');
});

test('translit: apostrophes drop, hyphens stay', () => {
  assert.equal(translitPart("Ak'"), 'Ак');
  assert.equal(translitPart('-si'), '-си');
  assert.equal(translitPart("'kern"), 'керн');
});

test('translit: funding words', () => {
  assert.equal(translitPart('August'), 'Август');
  assert.equal(translitPart('Dark'), 'Дарк');
  assert.equal(translitPart('Baron'), 'Барон');
});

test('translit: unknown part falls back to EN with warn', () => {
  const warns = [];
  const orig = console.warn;
  console.warn = (m) => warns.push(m);
  try {
    assert.equal(translitPart('XyzQw'), 'XyzQw');
  } finally {
    console.warn = orig;
  }
  assert.ok(warns.some((w) => String(w).includes('XyzQw')));
});
