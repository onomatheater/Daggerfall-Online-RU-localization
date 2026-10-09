import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { t, setLocale } from '../src/locale/locale.js';

const en = JSON.parse(fs.readFileSync(new URL('../src/locale/en.json', import.meta.url), 'utf8'));
const ru = JSON.parse(fs.readFileSync(new URL('../src/locale/ru.json', import.meta.url), 'utf8'));

// Batch 2026-10-09b: online account card (enhancedAccount + flow refs +
// duel/gate/raid/serpent/sd record lines + short months). Wardrobe
// TITLE_TEXT/AURA_TEXT are proper-noun titles: intentionally unwired.
const NEED = [
  'acct.tag', 'acct.one_moment', 'acct.your_account', 'acct.create_account',
  'acct.sign_in', 'acct.use_recovery', 'acct.signs_out_all', 'acct.write_down',
  'acct.code_once', 'acct.signed_in', 'acct.change_yours', 'acct.others_out',
  'acct.create_account_btn', 'acct.set_new', 'acct.change_password',
  'acct.agree_prefix', 'acct.worn_hint', 'acct.wear_title', 'acct.aura',
  'acct.glyphs', 'acct.showing', 'acct.hidden_press', 'acct.linked_no_tier',
  'acct.linked_titles', 'acct.refresh', 'acct.link_patreon', 'acct.unlink',
  'acct.duels', 'acct.no_duels', 'acct.duel_record', 'acct.duel_uncounted_generic',
  'acct.duel_uncounted_guest', 'acct.duel_uncounted_gap', 'acct.duel_uncounted_pair',
  'acct.duel_uncounted_winner', 'acct.none', 'acct.breaches', 'acct.towns',
  'acct.serpents', 'acct.hours', 'acct.silver', 'acct.characters', 'acct.renown',
  'acct.wardrobe', 'acct.name', 'acct.kind', 'acct.registered', 'acct.guest',
  'acct.guest_name', 'acct.time_played', 'acct.played_hm', 'acct.played_m',
  'acct.keep_all', 'acct.give_username', 'acct.signing_out', 'acct.sign_out',
  'acct.sign_out_all', 'acct.written_down', 'acct.working', 'acct.back',
  'acct.lost_password', 'acct.glyph_new', 'acct.record',
  'month.short.jan', 'month.short.feb', 'month.short.mar', 'month.short.apr',
  'month.short.may', 'month.short.jun', 'month.short.jul', 'month.short.aug',
  'month.short.sep', 'month.short.oct', 'month.short.nov', 'month.short.dec',
];

test('account batch: EN+RU share the new keys, RU non-empty', () => {
  for (const k of NEED) {
    assert.ok(en.dfo?.[k], 'en has ' + k);
    assert.ok(ru.dfo?.[k]?.length > 0, 'ru has ' + k);
  }
});

test('account exact RU values (QA-gated)', () => {
  const eq = (k, v) => assert.equal(ru.dfo[k], v, k);
  eq('acct.sign_in', 'Войти');
  eq('acct.code_once', 'Код показывается только один раз. Без него забытый пароль означает потерянную учётную запись.');
  eq('acct.agree_prefix', 'Принимаю условия: ');
  eq('acct.written_down', 'Код записан');
  eq('acct.guest_name', '{name} (гость).');
  eq('acct.duel_record', 'Побед: {w}, поражений: {l} (К/Д {kd})');
  eq('acct.no_duels', 'Дуэлей пока нет');
  eq('acct.none', 'Пока нет');
  eq('acct.renown', 'Слава');
  eq('acct.played_hm', '{h} ч {m} мин');
  eq('month.short.oct', 'окт.');
  eq('acct.registered', 'Зарегистрирована');
});

test('account renders in RU', () => {
  setLocale('ru');
  assert.equal(t('dfo:acct.sign_out'), 'Выйти');
  assert.equal(t('dfo:acct.wardrobe'), 'Гардероб');
  assert.equal(t('dfo:acct.change_password'), 'Сменить пароль');
  setLocale('en');
});
