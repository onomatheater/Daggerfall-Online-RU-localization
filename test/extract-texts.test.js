import test from 'node:test';
import assert from 'node:assert/strict';
import { extractTexts, rewriteFile, skipReason, skipHistogram } from '../tools/extract-texts.mjs';

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

test('skips class ternary branches, keeps word ternaries', () => {
  const src = `const b = el('button', a.primary ? 'act primary' : 'act', a.label);
const w = el('div', 'x', cond ? 'Yes' : 'No');`;
  const rows = extractTexts(src, 'fict');
  const byEn = Object.fromEntries(rows.map((r) => [r.en, r.key]));
  assert.ok(!byEn['act primary'] && !byEn['act'], 'class ternary skipped');
  assert.ok(byEn['Yes'] && byEn['No'], 'word ternary kept');
});

const CODEQ = `
a = 'Takes effect at once. ?fps forces it on.';
b = 'a?b:c';
c = reason === 'not built' ? 'Builds when you play' : 'On';
d = armState?.reason ?? 'not built';
e = name ?? 'Unknown';
`;

test('keeps ?-hints, skips code constants', () => {
  const rows = extractTexts(CODEQ, 'fict');
  const byEn = Object.fromEntries(rows.map((r) => [r.en, r.key]));
  assert.ok(byEn['Takes effect at once. ?fps forces it on.'], '?-hint kept');
  assert.ok(!byEn['a?b:c'], 'ternary frag skipped');
  assert.equal(byEn['not built'] && rows.find((r) => r.en === 'not built').risk, 'code-const', 'compared constant risk-flagged, not silently taken');
  assert.ok(byEn['Builds when you play'], 'display branch kept');
  assert.ok(byEn['Unknown'], 'capitalized fallback kept');
});

const RISKQ = `
const reason = armState?.reason ?? 'not built';
const label = UPDATE ?? 'a development build';
`;

test('marks ?? fallbacks as code-risk, rewrite leaves them', () => {
  const rows = extractTexts(RISKQ, 'fict');
  const byEn = Object.fromEntries(rows.map((r) => [r.en, r.key]));
  assert.ok(byEn['a development build'], 'fallback extracted for review');
  const row = rows.find((r) => r.en === 'a development build');
  assert.equal(row.risk, 'code-const', 'risk flagged');
  const { code, table } = rewriteFile(RISKQ, 'fict', { file: 'src/ui/fict.js' });
  assert.ok(code.includes(`?? 'a development build'`), 'rewrite does not touch risk rows');
  assert.equal(table.length, 0);
});

test('decodes JS escapes in literals', () => {
  const src = "a = 'Morrowind record\\u2019s texture';\nb = 'line one\\nline two';\nc = 'it\\'s';";
  const rows = extractTexts(src, 'fict');
  const byEn = Object.fromEntries(rows.map((r) => [r.en, r.key]));
  assert.ok(byEn['Morrowind record’s texture'], 'uXXXX decoded, no garbage');
  assert.ok(!Object.keys(byEn).some((k) => k.includes('u2019')), 'no escape remnants');
  assert.ok(byEn['it\'s'], 'escaped quote kept whole');
});

const REGEXQ = "const t = s.replace(/`([^`]*)`/g, '$1');\nconst w = 'Hello';\nconst q = a / b;\nconst d = x /= 2;";

test('regex literals do not desync the scan', () => {
  const rows = extractTexts(REGEXQ, 'fict');
  const byEn = Object.fromEntries(rows.map((r) => [r.en, r.key]));
  assert.ok(byEn['Hello'], 'string after regex kept');
  assert.ok(!byEn['$1'], '$1 has no letters, correctly ignored');
  assert.ok(!Object.keys(byEn).some((k) => k.includes('forEach') || k.length > 60), 'no swallowed code');
});

const RW = `el('div', 'row', 'Cancel');
el('div', 'row', 'Cancel');
box.classList.add('on');
`;

test('rewrite replaces display literals with ruT keys, keeps code', () => {
  const { code, table } = rewriteFile(RW, 'fict', { file: 'src/ui/fict.js', importFrom: '../locale/locale.js' });
  assert.equal(table.length, 1);
  assert.equal(table[0].en, 'Cancel');
  assert.equal(table[0].key, 'dfo:fict.cancel');
  assert.ok(code.includes(`ruT('dfo:fict.cancel')`), 'literal replaced');
  assert.ok(!code.includes(`'Cancel'`), 'no raw literal left');
  assert.ok(code.includes(`import { t as ruT } from '../locale/locale.js';`), 'import added');
  assert.ok(code.includes(`classList.add('on')`), 'class untouched');
  // идемпотентность: второй прогон ничего не меняет
  const again = rewriteFile(code, 'fict', { file: 'src/ui/fict.js', importFrom: '../locale/locale.js' });
  assert.equal(again.code, code);
  assert.equal(again.table.length, 0);
});

test('rewrite requires file and defaults to UI scope', () => {
  assert.throws(() => rewriteFile(RW, 'fict'), /opts\.file/,
    'no file = throw, not gross-volume');
  const out = rewriteFile(RW, 'fict', { file: 'src/net/x.js' });
  assert.equal(out.table.length, 0, 'non-UI file untouched by default');
  assert.equal(out.code, RW, 'code byte-identical');
});

const PROBE_NOISE = `
root.className = 'inputbox yesnobox';
x.textContent = 'Settings';
folder = \`SAVE\${key}\`;
setValue('GUI', 'LargeHUD', effBool('GUI', 'LargeHUD') ? 'False' : 'True');
showError('save failed, retry');
ok = 'OK';
`;

test('skips className slots, template-folder consts, ini-section args', () => {
  const rows = extractTexts(PROBE_NOISE, 'fict');
  const byEn = Object.fromEntries(rows.map((r) => [r.en, r.key]));
  assert.ok(!byEn['inputbox yesnobox'], 'className combo skipped');
  assert.ok(byEn['Settings'], 'textContent assignment kept');
  assert.ok(!byEn['SAVE'], 'template folder const skipped');
  assert.ok(!byEn['GUI'], 'ini section arg skipped');
  assert.ok(!byEn['LargeHUD'], 'ini key arg skipped');
  assert.ok(byEn['save failed, retry'], 'user-facing error kept');
  assert.ok(byEn['OK'], 'OK kept');
});

test('skips explain themselves: every drop has a reason id', () => {
  assert.equal(skipReason(''), 'empty');
  assert.equal(skipReason('dfo:menu.new'), 'key');
  assert.equal(skipReason('QBN: logic'), 'qbn');
  assert.equal(skipReason('https://x.y/z'), 'url-path');
  assert.equal(skipReason('MoveForwards'), 'camel-id');
  assert.equal(skipReason('.px-menu'), 'selector');
  assert.equal(skipReason('TODO: fix this'), 'dev-note');
  assert.equal(skipReason('700 11px bold'), 'font-shortcut');
  assert.equal(skipReason('ab === cd'), 'code-frag');
  assert.equal(skipReason('New Game'), null);
});

test('skipHistogram counts drops by reason (silence becomes visible)', () => {
  const hist = skipHistogram(`el('button', 'act', 'New Game');\nconst u = 'https://x.y/z';\nfoo('MoveForwards');\n`);
  assert.equal(hist['url-path'], 1);
  assert.equal(hist['camel-id'], 1);
  assert.ok(!('New Game' in hist), 'kept strings are not drops');
});
