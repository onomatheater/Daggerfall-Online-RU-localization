import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const en = JSON.parse(fs.readFileSync(new URL('../src/locale/en.json', import.meta.url), 'utf8'));
const ru = JSON.parse(fs.readFileSync(new URL('../src/locale/ru.json', import.meta.url), 'utf8'));

// Триаж титулов патронов (§7 п.3, вердикт proper 11.10): TITLE_TEXT/AURA_TEXT
// из ui/playerBadge.js (проверено чтением: 30 титулов + 8 аур) — имена
// собственные и серверные данные, не переводятся:
// - личные гранты (Shadow Fang — SirMcMobdon, Penitent — Diggleborf,
//   Aegis — Sureme, Primarch — GA00250, Crystal Fist — Flylighter,
//   Gatebreaker): перевести = переименовать чужую награду;
// - тиры Patreon (disciple/apostle/hierophant/herald) назначает Mac;
// - роли (founder/developer/dungeonmaster) и заработанные (seats/arena/
//   hours/cards/chapters) — общий с онлайном wire-ID; таблицы RU отстали
//   бы от релейного словаря (новые титулы приходят по сети).
// Гвард: сегмент ключа (по . и :) не равен ни одному wire-ID бейджа.
// Allowlist: feat.quest-herald* — другой смысл («Quest news», глашатай),
// проверено чтением значений, не титул Herald.
const BADGE_IDS = new Set([
  'founder', 'developer', 'dungeonmaster', 'disciple', 'apostle',
  'hierophant', 'shadowfang', 'penitent', 'gatebreaker', 'herald',
  'warden', 'protector', 'crowned', 'keeper', 'champion', 'grandchampion',
  'arenachampion', 'aegis', 'primarch', 'crystalfist', 'hourbreaker',
  'hoursfirst', 'iliacchampion', 'chaptermaster', 'chapterofficer',
  'formermaster', 'highmaster', 'seasonmaster', 'dagonfire', 'oblivionward',
  'radiance', 'shadowcloak', 'seraphwings', 'resonance', 'turninghour',
  'firsthour',
]);
const ALLOW = new Set(['feat.quest-herald', 'feat.quest-herald.note', 'feat.quest-herald.effect']);

test('titles guard: no table key names a badge', () => {
  const keys = [...Object.keys(en.dfo ?? {}), ...Object.keys(ru.dfo ?? {})];
  const hits = keys.filter(
    (k) => !ALLOW.has(k) && k.split(/[.:]/).some((seg) => BADGE_IDS.has(seg.toLowerCase())),
  );
  assert.deepEqual(hits, [], 'badge ids in keys: ' + hits.join(', '));
});
