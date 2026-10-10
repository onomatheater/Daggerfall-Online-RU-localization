import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { t, setLocale } from '../src/locale/locale.js';

const en = JSON.parse(fs.readFileSync(new URL('../src/locale/en.json', import.meta.url), 'utf8'));
const ru = JSON.parse(fs.readFileSync(new URL('../src/locale/ru.json', import.meta.url), 'utf8'));

// skyDayWords() returns runtime-computed EN prose (midnight/dusk times) —
// it rendered raw EN in the middle of the RU explainer. Split into 5
// param-keys; wiring passes {day}/{date}/{t} through (tOr {x} replace).
const NEED = [
  'online.sky_day_hour', 'online.sky_day_two', 'online.sky_midnight_hour',
  'online.sky_midnight_at', 'online.sky_dusk',
];

test('sky batch: EN+RU share the new keys, RU non-empty', () => {
  for (const k of NEED) {
    assert.ok(en.dfo?.[k], 'en has ' + k);
    assert.ok(ru.dfo?.[k]?.length > 0, 'ru has ' + k);
  }
});

test('sky exact RU values (QA-gated)', () => {
  const eq = (k, v) => assert.equal(ru.dfo[k], v, k);
  eq('online.sky_day_hour', 'Сутки в мире длятся час реального времени: {day}.');
  eq('online.sky_day_two', 'Сутки в мире длятся два часа реального времени до {date}; дальше — час: {day}.');
  eq('online.sky_midnight_hour', 'полночь наступает ровно в начале часа');
  eq('online.sky_midnight_at', 'полночь наступает в {t}');
  eq('online.sky_dusk', 'а сумерки — в {t}');
});

test('sky renders in RU', () => {
  setLocale('ru');
  assert.equal(t('dfo:online.sky_dusk', { t: ':45' }), 'а сумерки — в :45');
  setLocale('en');
});
