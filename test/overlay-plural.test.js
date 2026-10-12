// NEED: оверлейный путь рендерит plural-тройки строкой, а не объектом.
// - resolve('dfo:feat.n_modules') с {one,few,many} сейчас отдаёт сырой объект
//   (-> [object Object] на экране); нужен выбор формы через plural() из morph.js.
// - wrapPlural(key, n): 1 -> '1 модуль', 3 -> '3 модуля', 7 -> '7 модулей'.
// - Строковые ключи работают как раньше, без изменений.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createOverlay } from '../src/locale/loader.js';
import { setLocale, setGameVersion, registerPack, wrapPlural, wrapLiteral } from '../inject/locale-adapter.js';

setLocale('ru');

const FORMS = { one: '# модуль', few: '# модуля', many: '# модулей' };

test('overlay plural: object forms render as string per CLDR-ru', async () => {
  const { resolvePlural } = await import('../src/locale/loader.js');
  const ov = createOverlay({ en: {} });
  ov.register('ru', 'dfo', { 'feat.n_modules': { ...FORMS } });
  assert.equal(resolvePlural(ov, 'dfo:feat.n_modules', 1), '1 модуль');
  assert.equal(resolvePlural(ov, 'dfo:feat.n_modules', 3), '3 модуля');
  assert.equal(resolvePlural(ov, 'dfo:feat.n_modules', 7), '7 модулей');
});

test('wrapPlural serves pack forms, string keys untouched', () => {
  setGameVersion('7553');
  const rep = registerPack({
    manifest: { locale: 'ru', version: '9.9.9', game: '7553', files: [] },
    tables: { dfo: { 'feat.n_modules': { ...FORMS }, pluralProbeStr: 'Паковая строка.' } },
  });
  assert.equal(rep.ok, true);
  assert.equal(wrapPlural('dfo:feat.n_modules', 1), '1 модуль');
  assert.equal(wrapPlural('dfo:feat.n_modules', 3), '3 модуля');
  assert.equal(wrapPlural('dfo:feat.n_modules', 7), '7 модулей');
  assert.equal(wrapLiteral('dfo:pluralProbeStr', {}), 'Паковая строка.');
});
