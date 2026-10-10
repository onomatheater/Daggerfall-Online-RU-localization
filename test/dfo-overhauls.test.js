import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { t, setLocale } from '../src/locale/locale.js';

const en = JSON.parse(fs.readFileSync(new URL('../src/locale/en.json', import.meta.url), 'utf8'));
const ru = JSON.parse(fs.readFileSync(new URL('../src/locale/ru.json', import.meta.url), 'utf8'));

// Wave 2 batch 4a: overhauls (Mods) page data — pack titles, blurbs, effects,
// texture options and errors from systems/overhauls.js + dfmodTextures.js.
// Reused, not duplicated: 'Classic' → val.classic, 'Vanilla Enhanced' stays
// (proper pack name), G.title/G.blurb are dynamic mod data (skipped).
const NEED = [
  'ovh.texture', 'ovh.texture.effect', 'ovh.texture.classic_blurb',
  'ovh.ve.blurb', 'ovh.sound', 'ovh.sound.effect', 'ovh.sound.classic_blurb',
  'ovh.sound.enhanced_by', 'ovh.sound.enhanced_blurb', 'ovh.ui',
  'ovh.ui.effect', 'ovh.ui.online', 'ovh.ui.classic_blurb', 'ovh.ui.port_by',
  'ovh.ui.port_blurb', 'ovh.tex.err_read',
  'ovh.tex.err_memory',
];

// Ruling: ovh.tex.albedo/mask/snowless DROPPED — code identifiers
// (map kinds, Mod.FileName match), never rendered. No dead keys.

test('overhauls batch: EN+RU share the new keys, RU non-empty', () => {
  for (const k of NEED) {
    assert.ok(en.dfo?.[k], 'en has ' + k);
    assert.ok(ru.dfo?.[k]?.length > 0, 'ru has ' + k);
  }
});

test('overhauls exact RU values (QA-gated)', () => {
  const eq = (k, v) => assert.equal(ru.dfo[k], v, k);
  eq('ovh.texture', 'Переработка текстур');
  eq('ovh.sound', 'Переработка звуков');
  eq('ovh.ui', 'Переработка интерфейса');
  eq('ovh.ui.effect', 'Переключение перезапускает игру.');
  eq('ovh.ui.port_by', 'Порт');
});

test('overhauls renders in RU', () => {
  setLocale('ru');
  assert.equal(t('dfo:ovh.texture'), 'Переработка текстур');
  assert.equal(t('dfo:ovh.ui.effect'), 'Переключение перезапускает игру.');
  setLocale('en');
});
