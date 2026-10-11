import test from 'node:test';
import assert from 'node:assert/strict';
import { t, setLocale } from '../src/locale/locale.js';
import en from '../src/locale/en.json' with { type: 'json' };
import ru from '../src/locale/ru.json' with { type: 'json' };

// NEED: авторские description модов (MOD_SETTINGS keys.Enabled.description,
// жалоба человека 11.10 — карточка фичи на EN) + 13 effect-строк + шаблон
// авторства "{title} от {author}" (слово человека: имена proper, by → от).
// EN — байт-в-байт из modSettings.js/features.js@7815 (дамп tmp mods-en.json).
// Рендер notes/effects идёт через probe-ruByEn (словарь из таблиц, кода не
// надо); title — патч шаблона с params в пробе.

const VENDORS = ['dynamic-skies', 'world-tooltips', 'seasons-iliac-bay', 'low-poly-trees', 'roads-hazelnut', 'world-of-daggerfall', 'aquatic-sprites', 'detailed-ships', 'beautiful-villages', 'beautiful-cities', 'warm-ashes-ships', 'world-events-raiding-parties', 'foraging', 'iliac-puddle-no-more', 'ocean-holes', 'come-sail-away', 'meanerMonsters', 'pcaao', 'unleveledLoot', 'diverse-weapons', 'roleplay-realism-items', 'roleplay-realism', 'shield-widget', 'weapon-widget', 'handheld-torches', 'ambient-text', 'eye-of-the-beholder', 'immersive-footsteps', 'better-ambience', 'oblivion-remaster-leveling', 'travel-options', 'immersive-travel', 'physical-items', 'heat-haze', 'windfall', 'snowfall', 'horse-cart-and-cargo', 'project-legacy'];

const FX = ['fx.game_loads', 'fx.game_started_map', 'fx.game_started_towns', 'fx.sea_voyage', 'fx.quests_load', 'fx.monsters_change', 'fx.drop_restock', 'fx.weapon_drawn', 'fx.items_land', 'fx.scroll_out', 'fx.dungeon_fog', 'fx.next_character', 'fx.family_model'];

const NEED = [...VENDORS.map((v) => `dfo:feat.mod.${v}.note`), ...FX.map((k) => `dfo:${k}`), 'dfo:mod.title_by'];

test('mods-prose: 52 keys exist, RU non-empty', () => {
  assert.equal(NEED.length, 52);
  for (const full of NEED) {
    const [table, key] = full.split(':');
    assert.ok(en[table][key] !== undefined, 'missing EN ' + full);
    assert.ok(typeof ru[table][key] === 'string' && ru[table][key].length > 0, 'missing RU ' + full);
  }
});

test('mods-prose: exact EN pins', () => {
  assert.ok(en.dfo['feat.mod.windfall.note'].startsWith('Wind in the enhanced outdoors that changes by the day:'));
  assert.equal(en.dfo['fx.sea_voyage'], 'Takes effect on your next sea voyage.');
  assert.equal(en.dfo['mod.title_by'], '{title} by {author}');
});

test('mods-prose: exact RU pins', () => {
  assert.ok(ru.dfo['feat.mod.windfall.note'].includes('меняющийся день ото дня'));
  assert.ok(ru.dfo['feat.mod.foraging.note'].includes('корзиной (Basket)'));
  assert.ok(ru.dfo['feat.mod.come-sail-away.note'].includes('по купчей'));
  assert.ok(ru.dfo['feat.mod.meanerMonsters.note'].includes('дракончик'));
  assert.ok(ru.dfo['feat.mod.roleplay-realism.note'].includes('ссуды банка по уровню'));
  assert.ok(ru.dfo['feat.mod.better-ambience.note'].includes('когда вас ранят'));
  assert.ok(ru.dfo['feat.mod.world-events-raiding-parties.note'].includes('по всему заливу'));
  assert.equal(ru.dfo['fx.sea_voyage'], 'Вступает в силу в следующем морском плавании.');
  assert.equal(ru.dfo['mod.title_by'], '{title} от {author}');
});

test('mods-prose: renders in RU', () => {
  setLocale('ru');
  assert.equal(t('dfo:mod.title_by', { title: 'Windfall', author: 'demifiend000' }), 'Windfall от demifiend000');
  assert.ok(t('dfo:feat.mod.windfall.note').startsWith('Ветер в улучшенной природе'));
  setLocale('en');
  assert.equal(t('dfo:mod.title_by', { title: 'Windfall', author: 'demifiend000' }), 'Windfall by demifiend000');
});
