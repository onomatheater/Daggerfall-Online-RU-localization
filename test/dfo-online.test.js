import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { t, setLocale } from '../src/locale/locale.js';

const en = JSON.parse(fs.readFileSync(new URL('../src/locale/en.json', import.meta.url), 'utf8'));
const ru = JSON.parse(fs.readFileSync(new URL('../src/locale/ru.json', import.meta.url), 'utf8'));

// Wave 2 batch 3: online rail pane — explainer halves (split around the
// runtime skyDayWords() call) + bring-offline heading. Everything else on
// the pane already has keys (menu.* flow) and only needs probe wiring.
const NEED = [
  'online.explainer_shared', 'online.explainer_clock', 'online.bring_offline_once',
];

test('online batch: EN+RU share the new keys, RU non-empty', () => {
  for (const k of NEED) {
    assert.ok(en.dfo?.[k], 'en has ' + k);
    assert.ok(ru.dfo?.[k]?.length > 0, 'ru has ' + k);
  }
});

test('online exact RU values (QA-gated)', () => {
  const eq = (k, v) => assert.equal(ru.dfo[k], v, k);
  eq('online.bring_offline_once', 'Привести офлайн-персонажа (однократно)');
  eq('online.explainer_shared', 'Каждый играет в своё сохранение: вы видите друг друга и общаетесь где угодно. Привал капера, где начинается каждый персонаж, — у каждого свой. Подземелья и здания общие: враги, двери, рычаги и каждый открытый сундук, полка или шкаф — одни для всех, и навсегда. В городах и диких землях вы делите окружающих: кого встретит один игрок, видят и могут бить все рядом, и эти твари могут ранить и вас.');
});

test('online renders in RU', () => {
  setLocale('ru');
  assert.equal(t('dfo:online.bring_offline_once'), 'Привести офлайн-персонажа (однократно)');
  setLocale('en');
});
