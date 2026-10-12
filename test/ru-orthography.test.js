import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { t, setLocale } from '../src/locale/locale.js';

const en = JSON.parse(fs.readFileSync(new URL('../src/locale/en.json', import.meta.url), 'utf8'));
const ru = JSON.parse(fs.readFileSync(new URL('../src/locale/ru.json', import.meta.url), 'utf8')).strings;
const fa = JSON.parse(fs.readFileSync(new URL('../src/locale/ru.json', import.meta.url), 'utf8')).factions;

test('orthography: yo and homoglyphs', () => {
  setLocale('ru');
  assert.equal(t('strings:pronounHers'), 'её');
  assert.equal(t('strings:freeAction'), 'Свобода действий');
  assert.ok(t('strings:activeQuestsInfo').startsWith('Щёлкните'));
  assert.ok(t('strings:finishedQuestsInfo').includes('её.'));
  assert.ok(t('strings:notebookInfo').includes('её.'));
  assert.ok(t('strings:confirmMove2').includes('щёлкнете'));
  assert.ok(t('strings:youPinchedGoldPieces').includes('Вы стащили'));
  assert.ok(t('strings:lightRefuel').includes('Вы заправляете'));
  assert.equal(t('strings:youAreBlending'), 'Слияние с тенями.');
  assert.equal(t('strings:highElf'), 'Высший эльф');
  assert.equal(t('strings:darkElf'), 'Тёмный эльф');
  assert.equal(t('strings:unknown'), 'неизвестно');
  assert.ok(t('strings:oldLeaderFate3').startsWith('ушёл'));
  assert.equal(fa['240'], 'Храмовые Миссионеры');
  setLocale('en');
});

test('tooltips not truncated: all hotkey placeholders present', () => {
  for (const k of ['automapToolTipUpstairsButton', 'automapToolTipDownstairsButton']) {
    for (const ph of ['{0}', '{1}', '{2}', '{3}', '{4}']) {
      assert.ok(ru[k].includes(ph), `${k} has ${ph}`);
    }
    assert.ok(ru[k].length > 300, `${k} full length`);
  }
  void en;
});
