import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const en = JSON.parse(fs.readFileSync(new URL('../src/locale/en.json', import.meta.url), 'utf8'));
const ru = JSON.parse(fs.readFileSync(new URL('../src/locale/ru.json', import.meta.url), 'utf8'));

// Task 2 triage (plan docs/superpowers/plans/2026-10-10-menu-remainder-features.md):
// credits.js is a data table (CREDITS); its author:/contact: literals are
// proper names and must NEVER be translated. Snapshot as of upstream 7372.
// Titles (title:) resolve via feat.*/bindgrp.* tables, not dfo:credits.*.
const PROPER_NAMES = [
  'BadLuckBurt and carademono', 'Bethesda Softworks', 'Cliffworms',
  'Cliffworms, through the Nexus page (daggerfallunity mod 1080)',
  'Cliffworms, through the Nexus page (daggerfallunity mod 276)',
  'DFU Discord', 'DFU forums', 'Gavin Clayton (Interkarma) and contributors',
  'Greatness7', 'Greatness7, through the Nexus page (morrowind mod 46069)',
  'Harbinger451', 'Hazelnut', 'Hazelnut & Ralzar',
  'Hazelnut, through the DFU forums (forums.dfworkshop.net) or the Nexus page (daggerfallunity mod 16)',
  'Hazelnut, through the DFU forums (forums.dfworkshop.net) or the Nexus page (daggerfallunity mod 61)',
  'Joshua Steinhauer', 'Kamer', 'Kirk.O',
  'Lattymoy, Ghð§† and Positronico',
  'LordSquacquerone',
  'LordSquacquerone, through the Nexus page (daggerfallunity mod 1222)',
  'Mac (Lattymoy)', 'Ralzar',
  'Ralzar, through the DFU forums (the manifest’s ContactInfo)',
  'Ralzar, through the Nexus page the manifest names as its ContactInfo (daggerfallunity mod 135)',
  'RealAKP', 'RealAKP, through the Nexus page (daggerfallunity mod 242)',
  'RedRoryOTheGlen',
  'RedRoryOTheGlen, through the Nexus page (daggerfallunity mod 1131)',
  'RedRoryOTheGlen, through the Nexus page (daggerfallunity mod 733)',
  'RedRoryOTheGlen, through the Nexus page (daggerfallunity mod 780)',
  'RedRoryOTheGlen, through the Nexus page (daggerfallunity mod 860)',
  'Regnier', 'RosyTheRascal', 'SquidKamer', 'The Silkscreen Project Authors',
  'The vgmstream authors, and the Xiph.org Foundation (libvorbis)',
  'Unnamed (ExistingClasses)', 'Unnamed (Nexus Morrowind 56569)',
  'Unnamed (Nexus mod 1390)', 'carademono',
  'carademono, through the Lysandus’ Tomb Discord server', 'demifiend000',
  'demifiend000, through the Nexus page (daggerfallunity mod 1374)',
  'demifiend000, through the Nexus page (daggerfallunity mod 1396)',
  'demifiend000, through the Nexus page (daggerfallunity mod 1397)',
  'demifiend000, through the Nexus page (daggerfallunity mod 1401)',
  'demifiend000, through the Nexus page (daggerfallunity mod 1411)',
  'forums.dfworkshop.com (the manifest’s ContactInfo)', 'forums.dfworkshop.net',
  'jefetienne',
  'jefetienne, through the DFU forums (the manifest’s ContactInfo)', 'jet082',
  'jet082, through the Nexus page (daggerfallunity mod 1304)',
  'jet082, through the Nexus page (daggerfallunity mod 1313)',
  'kirkoliveri@gmail.com (the manifest’s ContactInfo)', 'kkgobkk',
  'kkgobkk, through the Nexus page (daggerfallunity mod 986)',
  'rmufrancisco@gmail.com',
];

test('credits triage: proper names are never translated', () => {
  assert.equal(PROPER_NAMES.length, 59);
  const ruByEn = new Map(Object.keys(en.dfo).map((k) => [en.dfo[k], ru.dfo[k]]));
  for (const n of PROPER_NAMES) {
    if (ruByEn.has(n)) assert.equal(ruByEn.get(n), n, 'translated proper name: ' + n);
  }
});
