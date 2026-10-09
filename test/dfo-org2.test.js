import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { t, setLocale } from '../src/locale/locale.js';

const en = JSON.parse(fs.readFileSync(new URL('../src/locale/en.json', import.meta.url), 'utf8'));
const ru = JSON.parse(fs.readFileSync(new URL('../src/locale/ru.json', import.meta.url), 'utf8'));

const NEED = [
  'cat.graphics', 'cat.gameplay', 'cat.combat', 'cat.world',
  'sec.audio.volume', 'sec.audio.music', 'sec.audio.sounds',
  'sec.graphics.effects', 'sec.controls.bindings', 'sec.mods.index',
  'filter.all', 'filter.changed', 'filter.enhanced', 'filter.mod', 'filter.classic',
  'search.settings', 'empty.changed', 'empty.none', 'empty.nomatch', 'pause.note',
  'card.status', 'sections.strip', 'mark.changed', 'restore.tab_title', 'online_mods.note',
  'alloff.row', 'alloff.title', 'alloff.body', 'alloff.confirm',
  'reset.row', 'restore.defaults', 'restore.tabnote', 'skip.name', 'skip.note',
  'launcher.news.item_update',
];

const braces = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

test('org2 table complete: EN+RU same keys, RU non-empty', () => {
  for (const k of NEED) {
    assert.ok(en.dfo?.[k], 'en has ' + k);
    assert.ok(ru.dfo?.[k]?.length > 0, 'ru has ' + k);
  }
  assert.ok(Object.keys(en.dfo ?? {}).length >= 850, 'dfo volume, got ' + Object.keys(en.dfo ?? {}).length);
});

test('org2 placeholders parity EN/RU', () => {
  for (const k of NEED) {
    assert.equal(braces(ru.dfo[k]), braces(en.dfo[k]), 'braces ' + k);
  }
});

test('org2 renders in RU', () => {
  setLocale('ru');
  assert.equal(t('dfo:cat.graphics'), 'Графика');
  assert.equal(t('dfo:sec.audio.volume'), 'Громкость');
  assert.equal(t('dfo:card.status', { n: 6, m: 2 }), 'Строк: 6 · изменено: 2');
  assert.equal(t('dfo:filter.changed'), 'Изменённые');
  setLocale('en');
});
