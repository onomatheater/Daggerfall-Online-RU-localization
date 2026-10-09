import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { t, setLocale } from '../src/locale/locale.js';

const en = JSON.parse(fs.readFileSync(new URL('../src/locale/en.json', import.meta.url), 'utf8'));
const ru = JSON.parse(fs.readFileSync(new URL('../src/locale/ru.json', import.meta.url), 'utf8'));

// Batch 2026-10-10: feature tiles (systems/features.js) — title/note/effect
// keyed by feature id. Mod proper nouns (author names) stay Latin.
const IDS = [
  'smaller-dungeons', 'medium-dungeons', 'world-dungeon-sizes', 'land-view-distance',
  'enhanced-environments', 'enhanced-ai', 'enhanced-climbing', 'enhanced-water',
  'water-quality', 'enhanced-lighting', 'modded-lighting', 'grass', 'cloud-quality',
  'ground-sharpness', 'render-scale', 'enhanced-combat-visuals', 'quick-loot',
  'loot-rarity', 'wind', 'enhanced-sounds', 'first-person-lighting', 'enhanced-map',
  'dungeon-map-3d', 'tamriel-map', 'tamriel-land', 'weather-events', 'real-forests',
  'landforms', 'road-verges', 'climate-blend', 'nearby-quests', 'living-world',
  'mod-windmills-kamer', 'mod-weapon-sheathing', 'steel-helm', 'mw-spell-effects',
  'enemy-infighting', 'varied-dungeon-monsters', 'torches-from-items', 'combat-voices',
  'near-death-warning', 'bows-left-hand', 'choose-guild-jobs', 'dungeon-wall-style',
  'quick-slots', 'loading-screen', 'quest-herald', 'quest-tracker', 'quest-marks',
  'quest-guidance', 'dungeon-sense', 'dungeon-echoes', 'dungeon-way-out',
  'wilderness-camps', 'road-encounters', 'town-watch', 'blood',
  'mod-climates-calories', 'naval-combat',
];

const NEED = IDS.flatMap((id) => [`feat.${id}`, `feat.${id}.note`, `feat.${id}.effect`]);
NEED.push(
  'feat.landview.dag3', 'feat.landview.far6',
  'kind.enhanced', 'kind.enhanced.blurb', 'kind.mod', 'kind.mod.blurb',
  'kind.classic', 'kind.classic.blurb',
  'featgroup.sight', 'featgroup.world', 'featgroup.loot', 'featgroup.combat',
  'featgroup.character', 'featgroup.interface', 'featgroup.sound',
);

test('feats batch: EN+RU share all tile keys, RU non-empty', () => {
  for (const k of NEED) {
    assert.ok(en.dfo?.[k], 'en has ' + k);
    assert.ok(ru.dfo?.[k]?.length > 0, 'ru has ' + k);
  }
});

test('feats exact RU values (QA-gated)', () => {
  const eq = (k, v) => assert.equal(ru.dfo[k], v, k);
  eq('feat.render-scale', 'Масштаб рендера');
  eq('feat.render-scale.effect', 'Вступает в силу сразу.');
  eq('feat.land-view-distance.effect', 'Вступит в силу при следующей загрузке мира.');
  eq('feat.loot-rarity', 'Редкость добычи');
  eq('feat.town-watch', 'Стража защищает город');
  eq('feat.blood.note', 'Пятна остаются на полах и стенах там, где пролилась кровь. Сильный добивающий удар разбрызгивает её дальше, а тяжёлый удар по вам оставит пару капель на экране. Ползунок задаёт количество — от «Легко» до «Бойня»; «Выкл» оставляет классический быстро исчезающий всплеск.');
});

test('feats render in RU', () => {
  setLocale('ru');
  assert.equal(t('dfo:feat.grass'), 'Трава');
  assert.equal(t('dfo:feat.wind'), 'Ветер');
  setLocale('en');
});
