import test from 'node:test';
import assert from 'node:assert/strict';
import { extractTexts } from '../tools/extract-texts.mjs';

const FICTIONAL = `
<button>New Game</button>
<label class="x">Load Game</label>
el.textContent = 'Settings';
el.innerHTML = '3 hours';
link.href = './assets/map.png';
box.classList.add('on');
t('dfo:menu.new');
msg = 'QBN: start logic';
`;

test('extracts display texts, skips urls/classes/keys/qbn', () => {
  const rows = extractTexts(FICTIONAL, 'fict');
  const byEn = Object.fromEntries(rows.map((r) => [r.en, r.key]));
  assert.ok(byEn['New Game']?.startsWith('dfo:fict.'));
  assert.ok(byEn['Load Game']);
  assert.ok(byEn['Settings']);
  assert.ok(byEn['3 hours']);
  assert.ok(!byEn['./assets/map.png']);
  assert.ok(!byEn['on']);
  assert.ok(!byEn['QBN: start logic']);
  assert.ok(!rows.some((r) => r.en.includes('dfo:menu.new')));
});

test('placeholders survive, duplicates share key', () => {
  const rows = extractTexts(`a('You see %s');\nb('You see %s');`, 'fict');
  assert.equal(rows.length, 1);
  assert.match(rows[0].en, /%s/);
});
