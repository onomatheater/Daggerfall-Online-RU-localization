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

const NOISY = `
// TILE1: the character portrait, 'f:ake' note
/* block comment with 'Quoted junk' inside */
w = "player's sword";
v = 'On';
u = 'Off';
ini = 'Video/RandomDungeonTextures';
cls = 'intro-film';
attr = 'aria-label';
code = '= 0 && i';
tpl = \`hello \${name}\`;
cap = 'Well-known Pain';
dash = 'well-known';
`;

test('ignores comments, keeps possessives, skips ids/classes/code', () => {
  const rows = extractTexts(NOISY, 'fict');
  const byEn = Object.fromEntries(rows.map((r) => [r.en, r.key]));
  assert.ok(byEn["player's sword"], 'possessive stays whole');
  assert.ok(!Object.keys(byEn).some((k) => k.startsWith('s ') || k.endsWith(' s')), 'no apostrophe shreds');
  assert.ok(!Object.keys(byEn).some((k) => k.includes('TILE1') || k.includes('Quoted junk')), 'no comments');
  assert.ok(byEn['On'] && byEn['Off'], 'short UI words kept');
  assert.ok(!byEn['Video/RandomDungeonTextures'], 'ini id skipped');
  assert.ok(!byEn['intro-film'], 'css class skipped');
  assert.ok(!byEn['aria-label'], 'attr name skipped');
  assert.ok(!byEn['= 0 && i'], 'code frag skipped');
  assert.ok(!Object.keys(byEn).some((k) => k.includes('${')), 'no template remnants');
  assert.ok(byEn['Well-known Pain'], 'capitalized hyphen kept');
  assert.ok(!byEn['well-known'], 'lowercase-hyphen skipped (class-like, safe side)');
});

const CTX = `
el('div', 'act primary', 'Cancel');
x.querySelector('.px-profile');
c('menu.saveGame');
el('span', 'On');
y = '.intro-skip';
`;

test('skips dotted ids, selectors, el() class slot', () => {
  const rows = extractTexts(CTX, 'fict');
  const byEn = Object.fromEntries(rows.map((r) => [r.en, r.key]));
  assert.ok(!byEn['act primary'], 'el 2nd-arg class skipped');
  assert.ok(byEn['Cancel'], 'el text arg kept');
  assert.ok(!byEn['.px-profile'], 'selector skipped');
  assert.ok(!byEn['menu.saveGame'], 'dotted id skipped');
  assert.ok(byEn['On'], 'capitalized 2nd arg kept');
  assert.ok(!byEn['.intro-skip'], 'leading-dot skipped');
});
