import test from 'node:test';
import assert from 'node:assert/strict';
import { t, setLocale } from '../src/locale/locale.js';
import en from '../src/locale/en.json' with { type: 'json' };
import ru from '../src/locale/ru.json' with { type: 'json' };

// NEED: проза credits (батч B4b, 51 ряд: 6 builtOn + 45 mods = 100 блоков
// what/terms + 2 заголовка). EN — байт-в-байт из dfjs/src/ui/credits.js@7815
// (дамп: tmp credits-en.json), RU — QA-гейты + слово человека 11.10.
// title/author — proper, ключей нет (держит dfo-credits-guard).
// Отклонение от конвенции: точные RU-пины — заголовки + по одному блоку
// каждой секции; все 102 значения целиком держит глобальный ru-scan-гвард
// (Ё/mixed/пробелы) в этом же сьюте + побайтовый diff ревью.

const NEED = ['dfo:credits.heading.built_on', 'dfo:credits.heading.mods'];
for (let i = 0; i < 6; i++) {
  NEED.push(`dfo:credits.builtOn.${i}.what`);
  if (i >= 2) NEED.push(`dfo:credits.builtOn.${i}.terms`);
}
for (let i = 0; i < 45; i++) {
  NEED.push(`dfo:credits.mods.${i}.what`, `dfo:credits.mods.${i}.terms`);
}

test('credits-prose: 102 keys exist, RU non-empty', () => {
  assert.equal(NEED.length, 102);
  for (const full of NEED) {
    const [table, ...rest] = full.split(':');
    const key = rest.join(':');
    assert.ok(en[table][key] !== undefined, 'missing EN ' + full);
    assert.ok(typeof ru[table][key] === 'string' && ru[table][key].length > 0, 'missing RU ' + full);
  }
});

test('credits-prose: exact EN headings', () => {
  assert.equal(en.dfo['credits.heading.built_on'], 'Built on');
  assert.equal(en.dfo['credits.heading.mods'], 'Mods');
});

test('credits-prose: exact RU pins', () => {
  assert.equal(ru.dfo['credits.heading.built_on'], 'На чём построено');
  assert.equal(ru.dfo['credits.heading.mods'], 'Моды');
  assert.ok(ru.dfo['credits.builtOn.0.what'].startsWith('Игра. Каждый байт графики'));
  assert.ok(ru.dfo['credits.builtOn.2.terms'].includes('SIL Open Font License 1.1'));
  assert.ok(ru.dfo['credits.mods.0.what'].includes('вепри-оборотни'));
  assert.ok(ru.dfo['credits.mods.0.what'].includes('обе линейки'));
  assert.ok(ru.dfo['credits.mods.18.what'].includes('Классическая линейка'));
  assert.ok(ru.dfo['credits.mods.44.terms'].includes('vendor/sands-of-the-alikr/README.md'));
});

test('credits-prose: renders in RU', () => {
  setLocale('ru');
  assert.equal(t('dfo:credits.heading.built_on'), 'На чём построено');
  assert.equal(t('dfo:credits.heading.mods'), 'Моды');
  assert.ok(t('dfo:credits.mods.44.what').startsWith('Земля пустыни перекрашена'));
  setLocale('en');
  assert.equal(t('dfo:credits.heading.mods'), 'Mods');
});
