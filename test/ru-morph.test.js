import test from 'node:test';
import assert from 'node:assert/strict';
import { plural, select, month } from '../src/locale/morph.js';

test('russian plural: 1/2/5 книга', () => {
  const f = { one: '# книга', few: '# книги', many: '# книг' };
  assert.equal(plural(1, f), '1 книга');
  assert.equal(plural(2, f), '2 книги');
  assert.equal(plural(5, f), '5 книг');
  assert.equal(plural(11, f), '11 книг');
  assert.equal(plural(21, f), '21 книга');
  assert.equal(plural(22, f), '22 книги');
});

test('gender select, no runtime ifs in prod strings', () => {
  assert.equal(select('masculine', { masculine: 'Стальной', feminine: 'Стальная' }), 'Стальной');
  assert.equal(select('feminine', { masculine: 'Стальной', feminine: 'Стальная' }), 'Стальная');
  assert.equal(select('unknown', { masculine: 'Стальной', other: 'Стальное' }), 'Стальное');
});

test('month case: 15 Января, not Январь', () => {
  assert.equal(month(0, 'nom'), 'Январь');
  assert.equal(month(0, 'gen'), 'Января');
  assert.equal(month(0, 'prep'), 'Январе');
});
