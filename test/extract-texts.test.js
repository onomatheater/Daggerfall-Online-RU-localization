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

const SCOPE = `el('div', 'row', 'Hello');`;

test('scope limits extraction to display layer', () => {
  assert.equal(extractTexts(SCOPE, 'p', { file: 'src/net/x.js', include: ['src/ui/'] }).length, 0);
  const rows = extractTexts(SCOPE, 'p', { file: 'src/ui/y.js', include: ['src/ui/'] });
  assert.ok(rows.some((r) => r.en === 'Hello'));
});

const DEV = `
console.log('boot done');
console.warn('slow frame');
throw new Error('bad internal state');
assert(x, 'must hold');
showError('save failed, retry');
note = 'TODO: fix this';
hex = '#f3cf86';
art = '......kkkk......';
sel = 'body .dfdecor-card';
asset = 'BATTLEAXE.CIF_1-0';
ver = '1.7.7184';
bind = 'MoveForwards';
keep1 = 'Settings';
keep2 = 'St.';
`;

test('skips dev strings, colors, pixelart, selectors, asset ids, bind ids', () => {
  const rows = extractTexts(DEV, 'fict');
  const byEn = Object.fromEntries(rows.map((r) => [r.en, r.key]));
  for (const junk of ['boot done', 'slow frame', 'bad internal state', 'must hold', 'TODO: fix this',
    '#f3cf86', '......kkkk......', 'body .dfdecor-card', 'BATTLEAXE.CIF_1-0',
    '1.7.7184', 'MoveForwards']) {
    assert.ok(!byEn[junk], 'skipped: ' + junk);
  }
  assert.ok(byEn['save failed, retry'], 'user-facing error kept');
  assert.ok(byEn['Settings'], 'kept Settings');
  assert.ok(byEn['St.'], 'kept St.');
});

const CLS = `
a = 'px-home px-over lvl-shell';
b = 'bounty-';
c = 'micro-';
d = 'saves are only in your backup';
e = 'OK';
`;

test('skips class combos and lone lowercase tokens', () => {
  const rows = extractTexts(CLS, 'fict');
  const byEn = Object.fromEntries(rows.map((r) => [r.en, r.key]));
  assert.ok(!byEn['px-home px-over lvl-shell'], 'px combo skipped');
  assert.ok(!byEn['bounty-'], 'class prefix skipped');
  assert.ok(!byEn['micro-'], 'class prefix skipped');
  assert.ok(byEn['saves are only in your backup'], 'hyphen-free sentence kept');
  assert.ok(byEn['OK'], 'OK kept');
  assert.ok(!extractTexts(`x = '--hud-scale';`, 'fict').length, 'css var skipped');
});

const MISC = `
a = document.createElement('TEXTAREA');
b = '700 11px Cormorant, Georgia, serif';
c = 'Press a key...';
`;

test('skips tag names and font shorthands', () => {
  const rows = extractTexts(MISC, 'fict');
  const byEn = Object.fromEntries(rows.map((r) => [r.en, r.key]));
  assert.ok(!byEn['TEXTAREA'], 'createElement tag skipped');
  assert.ok(!byEn['700 11px Cormorant, Georgia, serif'], 'font shorthand skipped');
  assert.ok(byEn['Press a key...'], 'ellipsis text kept');
});
