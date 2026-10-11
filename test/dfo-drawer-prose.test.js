import test from 'node:test';
import assert from 'node:assert/strict';
import { t, setLocale } from '../src/locale/locale.js';
import en from '../src/locale/en.json' with { type: 'json' };
import ru from '../src/locale/ru.json' with { type: 'json' };

// NEED: описания настроек внутри карточек модов (MOD_SETTINGS keys.*.description,
// только показываемые: Modules.* + curated dials, 97 шт + общая строка материалов).
// Жалоба человека 11.10:
// игрок должен понимать клавиши и настройки без английского. EN — байт-в-байт
// из modSettings.js@7815 (дамп tmp drawer-shown.json + AST-сверка).
// Рендер — через ruByEn в modRow (патч пробы); 517 непоказываемых description
// осознанно вне скоупа. EOTB Compatibility.* — скрыты, не показываются.

const NEED = [
  'dfo:feat.cfg.iliac-puddle-no-more.General_SpawnUnderwaterEnemies',
  'dfo:feat.cfg.iliac-puddle-no-more.General_WaterSurfaceTopTransparency',
  'dfo:feat.cfg.iliac-puddle-no-more.General_UnderwaterFogStrength',
  'dfo:feat.cfg.iliac-puddle-no-more.General_UnderwaterFogDistance',
  'dfo:feat.cfg.iliac-puddle-no-more.General_SwimSpeedMultiplier',
  'dfo:feat.cfg.iliac-puddle-no-more.General_EnableSwimStroke',
  'dfo:feat.cfg.ocean-holes.General_PitSpawnRate',
  'dfo:feat.cfg.ocean-holes.General_DungeonVisualIntensity',
  'dfo:feat.cfg.ocean-holes.General_DungeonVisualDarkness',
  'dfo:feat.cfg.come-sail-away.WindDirectionWidget_Enable',
  'dfo:feat.cfg.come-sail-away.Waves_Enable',
  'dfo:feat.cfg.come-sail-away.Audio_SoundVolume',
  'dfo:feat.cfg.come-sail-away.SailingAssist_AutoTrimming',
  'dfo:feat.cfg.shield-widget.Shield_Scale',
  'dfo:feat.cfg.shield-widget.Shield_OffsetHorizontal',
  'dfo:feat.cfg.shield-widget.Shield_WhenAttacking',
  'dfo:feat.cfg.shield-widget.Modules_Bob',
  'dfo:feat.cfg.shield-widget.Modules_Inertia',
  'dfo:feat.cfg.shield-widget.Modules_Animation',
  'dfo:feat.cfg.shield-widget.Modules_Step',
  'dfo:feat.cfg.shield-widget.Modules_Recoil',
  'dfo:feat.cfg.shield-widget.Bob_Length',
  'dfo:feat.cfg.shield-widget.Inertia_Scale',
  'dfo:feat.cfg.weapon-widget.Modules_Swings',
  'dfo:feat.cfg.weapon-widget.Modules_Ambidexterity',
  'dfo:feat.cfg.weapon-widget.Modules_Offset',
  'dfo:feat.cfg.weapon-widget.Modules_Bob',
  'dfo:feat.cfg.weapon-widget.Modules_Inertia',
  'dfo:feat.cfg.weapon-widget.Modules_Step',
  'dfo:feat.cfg.weapon-widget.Modules_DoubleScaleTextures',
  'dfo:feat.cfg.weapon-widget.Modules_TrueTextureSize',
  'dfo:feat.cfg.weapon-widget.Modules_Recoil',
  'dfo:feat.cfg.weapon-widget.Swings_Speed',
  'dfo:feat.cfg.weapon-widget.Bob_Length',
  'dfo:feat.cfg.weapon-widget.Inertia_Scale',
  'dfo:feat.cfg.handheld-torches.Handling_RememberLastLightSource',
  'dfo:feat.cfg.handheld-torches.Handling_StowWhenSpellcasting',
  'dfo:feat.cfg.handheld-torches.Handling_RelaxedTwoHandedWeapons',
  'dfo:feat.cfg.handheld-torches.Handling_LanternsAtWaist',
  'dfo:feat.cfg.handheld-torches.Modules_Sprite',
  'dfo:feat.cfg.handheld-torches.Modules_Bob',
  'dfo:feat.cfg.handheld-torches.Modules_Inertia',
  'dfo:feat.cfg.handheld-torches.Modules_Step',
  'dfo:feat.cfg.handheld-torches.Presentation_AudioVolume',
  'dfo:feat.cfg.handheld-torches.Bob_Length',
  'dfo:feat.cfg.handheld-torches.Inertia_Scale',
  'dfo:feat.cfg.eye-of-the-beholder.Camera_FrontalPlaneOffset',
  'dfo:feat.cfg.eye-of-the-beholder.Camera_LongitudinalDistance',
  'dfo:feat.cfg.eye-of-the-beholder.Camera_Speed',
  'dfo:feat.cfg.eye-of-the-beholder.Animation_BillboardScale',
  'dfo:feat.cfg.immersive-footsteps.AudioQualitySettings_SoundClipQuality',
  'dfo:feat.cfg.immersive-footsteps.FootstepSettings_FootstepVolumeMulti',
  'dfo:feat.cfg.immersive-footsteps.ArmorSwaySettings_ArmorSwayVolumeMulti',
  'dfo:feat.cfg.better-ambience.Better Footsteps_enable',
  'dfo:feat.cfg.better-ambience.Dungeon Reverb_level',
  'dfo:feat.cfg.better-ambience.Dungeon Lighting_dungeonDarkness',
  'dfo:feat.cfg.travel-options.CautiousTravel_PlayerControlledCautiousTravel',
  'dfo:feat.cfg.travel-options.StopAtInnsTravel_PlayerControlledInnsTravel',
  'dfo:feat.cfg.travel-options.ShipTravel_OnlyFromPorts',
  'dfo:feat.cfg.travel-options.GeneralOptions_LocationPause',
  'dfo:feat.cfg.travel-options.GeneralOptions_AvoidObstacles',
  'dfo:feat.cfg.travel-options.GeneralOptions_FirstPersonTravel',
  'dfo:feat.cfg.travel-options.GeneralOptions_FirstPersonTravelFollowsRoads',
  'dfo:feat.cfg.immersive-travel.General_DisableNormalTravel',
  'dfo:feat.cfg.immersive-travel.General_DailyCarriageFee',
  'dfo:feat.cfg.immersive-travel.General_RegionLockedCarriages',
  'dfo:feat.cfg.immersive-travel.ShipTravel_DisableShipTravelOutsideDocks',
  'dfo:feat.cfg.physical-items.Enemy Loot_Physical Enemy Drops',
  'dfo:feat.cfg.physical-items.Enemy Loot_Impulse Strength',
  'dfo:feat.cfg.physical-items.Item Sizes_Weapons',
  'dfo:feat.cfg.physical-items.Item Sizes_Armor',
  'dfo:feat.cfg.heat-haze.Heat Haze_AllowSubtropical',
  'dfo:feat.cfg.heat-haze.Heat Haze_Intensity',
  'dfo:feat.cfg.windfall.General_OverallWindyPeriodFrequency',
  'dfo:feat.cfg.windfall.General_GustFrequency',
  'dfo:feat.cfg.windfall.Presentation_AudioEnabled',
  'dfo:feat.cfg.windfall.Presentation_AudioVolume',
  'dfo:feat.cfg.windfall.Presentation_LeavesEnabled',
  'dfo:feat.cfg.windfall.Presentation_SnowFlurriesEnabled',
  'dfo:feat.cfg.snowfall.Snowpack_SettlementMaximumDepth',
  'dfo:feat.cfg.snowfall.Snowpack_WildernessMaximumDepth',
  'dfo:feat.cfg.snowfall.Distance Prototype_Enabled',
  'dfo:feat.cfg.snowfall.NPC Tracks_Enabled',
  'dfo:feat.cfg.snowfall.Refill_PassiveRefillHours',
  'dfo:feat.cfg.horse-cart-and-cargo.Persistence_PhysicalPersistence',
  'dfo:feat.cfg.horse-cart-and-cargo.Presentation_ShowTrailingWagon',
  'dfo:feat.cfg.horse-cart-and-cargo.Following_HorseFollowDistance',
  'dfo:feat.cfg.horse-cart-and-cargo.Following_AvoidCombat',
  'dfo:feat.cfg.horse-cart-and-cargo.Following_FollowFastTravel',
  'dfo:feat.cfg.horse-cart-and-cargo.WagonAccess_InteriorAccessDistance',
  'dfo:feat.cfg.project-legacy.Family_Descendants',
  'dfo:feat.cfg.project-legacy.Family_Max Siblings',
  'dfo:feat.cfg.project-legacy.Family_Siblings Probability',
  'dfo:feat.cfg.project-legacy.Legacy_Model',
  'dfo:feat.cfg.project-legacy.Legacy_Toll',
  'dfo:feat.cfg.project-legacy.Legacy_Heirloom Chance',
  'dfo:feat.cfg.project-legacy.Legacy_Family In World',
];

test('drawer-prose: 97 keys exist, RU non-empty', () => {
  assert.equal(NEED.length, 97);
  for (const full of NEED) {
    const [table, key] = full.split(':');
    assert.ok(en[table][key] !== undefined, 'missing EN ' + full);
    assert.ok(typeof ru[table][key] === 'string' && ru[table][key].length > 0, 'missing RU ' + full);
  }
  // Общая строка материалов unleveledLoot (10 рядов, 1 текст, AST-проверено).
  assert.equal(en.dfo['feat.cfg.unleveledLoot.materials_note'], 'Whenever this material would drop, change it to the selected material.');
  assert.equal(ru.dfo['feat.cfg.unleveledLoot.materials_note'], 'Когда выпадет этот материал, заменить его выбранным.');
});

test('drawer-prose: exact RU pins', () => {
  assert.equal(ru.dfo['feat.cfg.come-sail-away.Audio_SoundVolume'], 'Звуки лодки: корпус, вёсла, море.');
  assert.ok(ru.dfo['feat.cfg.travel-options.CautiousTravel_PlayerControlledCautiousTravel'].includes('«Осторожно»'));
  assert.ok(ru.dfo['feat.cfg.travel-options.ShipTravel_OnlyFromPorts'].includes('только из мест с портами'));
  assert.ok(ru.dfo['feat.cfg.weapon-widget.Modules_Ambidexterity'].includes('(H)'));
  assert.ok(ru.dfo['feat.cfg.shield-widget.Modules_Animation'].includes('(рисунок: WilhelmBlack)'));
  assert.ok(ru.dfo['feat.cfg.project-legacy.Legacy_Toll'].includes('Дань Аркея'));
});

test('drawer-prose: renders in RU', () => {
  setLocale('ru');
  assert.equal(t('dfo:feat.cfg.come-sail-away.Audio_SoundVolume'), 'Звуки лодки: корпус, вёсла, море.');
  setLocale('en');
});
