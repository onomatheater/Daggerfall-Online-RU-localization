import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { t, setLocale } from '../src/locale/locale.js';

const en = JSON.parse(fs.readFileSync(new URL('../src/locale/en.json', import.meta.url), 'utf8'));
const ru = JSON.parse(fs.readFileSync(new URL('../src/locale/ru.json', import.meta.url), 'utf8'));

// Wave 2 batch 1 (fact-check 10.10): test-room pane data — 6 preset
// labels+blurbs + sea label + ride/loot/sea blurbs from systems/testRoom.js.
// Reused (Pay once, no dupes): TEST_RIDE.label → menu.ride_out, 'Set sail' →
// menu.set_sail, 'Enter with the ladder' → menu.enter_with_the_ladder.
// Race/class RU here are FIRST USE in repo and set precedent for Phase 2.
const NEED = [
  'testroom.nord_warrior', 'testroom.nord_warrior.blurb',
  'testroom.breton_sorceress', 'testroom.breton_sorceress.blurb',
  'testroom.redguard_archer', 'testroom.redguard_archer.blurb',
  'testroom.darkelf_nightblade', 'testroom.darkelf_nightblade.blurb',
  'testroom.khajiit_monk', 'testroom.khajiit_monk.blurb',
  'testroom.argonian_barbarian', 'testroom.argonian_barbarian.blurb',
  'testroom.sea', 'testroom.loot', 'testroom.ride.blurb', 'testroom.loot.blurb', 'testroom.sea.blurb',
];

test('testroom batch: EN+RU share the new keys, RU non-empty', () => {
  for (const k of NEED) {
    assert.ok(en.dfo?.[k], 'en has ' + k);
    assert.ok(ru.dfo?.[k]?.length > 0, 'ru has ' + k);
  }
});

test('testroom exact RU values (QA-gated)', () => {
  const eq = (k, v) => assert.equal(ru.dfo[k], v, k);
  eq('testroom.nord_warrior', 'Норд-воин');
  eq('testroom.breton_sorceress', 'Бретонка-чародейка');
  eq('testroom.redguard_archer', 'Редгард-лучница');
  eq('testroom.darkelf_nightblade', 'Тёмный эльф — ночной клинок');
  eq('testroom.khajiit_monk', 'Каджит-монах');
  eq('testroom.argonian_barbarian', 'Аргонианка-варвар');
  eq('testroom.nord_warrior.blurb', 'Обычный мужчина-человек — сталь и длинный меч.');
  eq('testroom.sea', 'Морской бой');
  eq('testroom.loot', 'Лестница лута');
});

test('testroom renders in RU', () => {
  setLocale('ru');
  assert.equal(t('dfo:testroom.nord_warrior'), 'Норд-воин');
  assert.equal(t('dfo:testroom.sea'), 'Морской бой');
  setLocale('en');
});
