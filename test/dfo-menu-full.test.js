import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { t, setLocale } from '../src/locale/locale.js';

const en = JSON.parse(fs.readFileSync(new URL('../src/locale/en.json', import.meta.url), 'utf8'));
const ru = JSON.parse(fs.readFileSync(new URL('../src/locale/ru.json', import.meta.url), 'utf8'));

const NEED = [
  'menu.continue', 'menu.newGame', 'menu.loadGame', 'menu.online', 'menu.testRoom',
  'menu.settings', 'menu.features', 'menu.overhauls', 'menu.screenshots', 'menu.about',
  'intro.skip', 'intro.continue', 'intro.preparing',
  'cat.game', 'cat.controls', 'cat.audio', 'cat.video', 'cat.interface', 'cat.accessibility', 'cat.mods',
  'fontscale.label', 'close',
  'settings.Controls/SoundVolume', 'settings.Controls/MusicVolume',
  'val.on', 'val.off', 'val.classic',
  'tip.Controls/SoundVolume',
];

const braces = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const pct = (s) => (String(s).match(/%s/g) || []).length;

test('dfo menu table complete: EN+RU same keys, RU non-empty', () => {
  const ek = Object.keys(en.dfo ?? {});
  const rk = Object.keys(ru.dfo ?? {});
  for (const k of NEED) {
    assert.ok(en.dfo?.[k], 'en has ' + k);
    assert.ok(ru.dfo?.[k]?.length > 0, 'ru has ' + k);
  }
  // Объём таблицы держит dfo-org2.test.js (>= 850 на той же en.dfo):
// слабый дубль >= 600 здесь удалён, чтобы гвозди не разъезжались.
  assert.deepEqual(new Set(ek), new Set(rk), 'en/ru key sets identical');
});

test('dfo placeholders parity EN/RU', () => {
  for (const k of Object.keys(en.dfo ?? {})) {
    assert.equal(braces(ru.dfo[k]), braces(en.dfo[k]), 'braces ' + k);
    assert.equal(pct(ru.dfo[k]), pct(en.dfo[k]), 'pct ' + k);
  }
});

test('dfo rails render in RU', () => {
  setLocale('ru');
  assert.equal(t('dfo:menu.continue'), 'Продолжить');
  assert.equal(t('dfo:menu.settings'), 'Настройки');
  assert.equal(t('dfo:settings.Controls/SoundVolume'), 'Громкость звука');
  setLocale('en');
});
