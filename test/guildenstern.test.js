import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { GUILDENSTERN_FACE, GUILDENSTERN_STACK, GUILDENSTERN_FILES } from '../src/font/guildenstern.js';

// Guildenstern NBP — читаемый кириллический пиксель-шрифт, вендорится явным
// решением человека 10.10 как исключение из OFL-only (CC BY-SA 3.0, см.
// vendor/guildenstern-nbp/ATTRIBUTION.md). Покрытие ниже — парсером cmap,
// не на глаз.

// Полное русское ядро: А-Я, а-я, Ёё. Должны быть все до единого.
const RUSSIAN_CORE = [];
for (let cp = 0x0410; cp <= 0x044f; cp++) RUSSIAN_CORE.push(cp);
RUSSIAN_CORE.push(0x0401, 0x0451); // Ёё

// Задокументированные зазоры (парсер 10.10): не русские буквы, а
// украинско-белорусско-македонские (Єє Іі Ѐѐ Ѝѝ) + Ґґ Ұұ и знак № U+2116.
// № — единственный зазор, бьющий по русскому UI: без него «№» рендерится
// как '?' (FNT_ERROR_CODE). Список точный: смена файла роняет тест.
const KNOWN_GAPS = [0x0400, 0x0404, 0x0406, 0x040d, 0x0450, 0x0454, 0x0456, 0x045d];

function cmapOf(fileName) {
  const buf = readFileSync(new URL(`../vendor/guildenstern-nbp/${fileName}`, import.meta.url));
  const u16 = (o) => buf.readUInt16BE(o);
  const u32 = (o) => buf.readUInt32BE(o);
  const numTables = u16(4);
  let cmapOff = 0;
  for (let i = 0; i < numTables; i++) {
    const o = 12 + i * 16;
    if (buf.toString('ascii', o, o + 4) === 'cmap') { cmapOff = u32(o + 8); break; }
  }
  assert.notEqual(cmapOff, 0, `${fileName}: есть таблица cmap`);
  const n = u16(cmapOff + 2);
  let sub = 0;
  for (let i = 0; i < n; i++) {
    const o = cmapOff + 4 + i * 8;
    if ((u16(o) === 3 && u16(o + 2) === 1) || (u16(o) === 0 && u16(o + 2) === 3)) {
      sub = cmapOff + u32(o + 4);
      break;
    }
  }
  assert.notEqual(sub, 0, `${fileName}: есть BMP-сабтаблица cmap`);
  assert.equal(u16(sub), 4, `${fileName}: cmap format 4`);
  const segCount = u16(sub + 6) / 2;
  const endO = sub + 14, startO = endO + segCount * 2 + 2;
  const deltaO = startO + segCount * 2, rangeO = deltaO + segCount * 2;
  const covered = new Set();
  for (let s = 0; s < segCount; s++) {
    const end = u16(endO + s * 2), start = u16(startO + s * 2);
    const delta = u16(deltaO + s * 2), roff = u16(rangeO + s * 2);
    for (let c = start; c <= end; c++) {
      let gid;
      if (roff === 0) gid = (c + delta) & 0xffff;
      else {
        gid = u16(rangeO + s * 2 + roff + (c - start) * 2);
        if (gid !== 0) gid = (gid + delta) & 0xffff;
      }
      if (gid !== 0) covered.add(c);
    }
    if (end === 0xffff) break;
  }
  return covered;
}

test('vendored files exist (pair + license + attribution)', () => {
  for (const f of GUILDENSTERN_FILES) {
    assert.equal(existsSync(new URL(`../vendor/guildenstern-nbp/${f}`, import.meta.url)), true, f);
  }
});

test('license is CC BY-SA 3.0 by Nate Halley (BY = credit on redistribute)', () => {
  const copyright = readFileSync(new URL('../vendor/guildenstern-nbp/COPYRIGHT.txt', import.meta.url), 'utf8');
  const readme = readFileSync(new URL('../vendor/guildenstern-nbp/readme.txt', import.meta.url), 'utf8');
  const attr = readFileSync(new URL('../vendor/guildenstern-nbp/ATTRIBUTION.md', import.meta.url), 'utf8');
  assert.match(copyright + readme, /Nate Halley/);
  assert.match(readme, /Creative Commons.*by-sa/i);
  assert.match(readme, /by-sa.+3\.0|3\.0.+by-sa/i);
  assert.match(attr, /Nate Halley/);
  assert.match(attr, /CC BY-SA 3\.0/);
  assert.match(attr, /ShareAlike|Share-Alike/i);
});

test('Guildenstern covers full Russian core incl. Ёё («» — em-dash)', () => {
  const covered = cmapOf('GuildensternNbp.ttf');
  for (const cp of RUSSIAN_CORE) {
    assert.equal(covered.has(cp), true, 'U+' + cp.toString(16));
  }
  for (const cp of [0x00ab, 0x00bb, 0x2014]) {
    assert.equal(covered.has(cp), true, 'U+' + cp.toString(16));
  }
});

test('known gaps locked exactly (non-Russian letters only)', () => {
  const covered = cmapOf('GuildensternNbp.ttf');
  const missing = [];
  for (let cp = 0x0400; cp <= 0x045f; cp++) if (!covered.has(cp)) missing.push(cp);
  assert.deepEqual(missing, KNOWN_GAPS);
});

test('№ U+2116 gap is explicit (renders as ? until resolved)', () => {
  const covered = cmapOf('GuildensternNbp.ttf');
  assert.equal(covered.has(0x2116), false, '№ missing by design, see ATTRIBUTION.md');
});

test('Rosencrantz pair file ships with identical Cyrillic coverage', () => {
  const g = cmapOf('GuildensternNbp.ttf');
  const r = cmapOf('RosencrantzNbp.ttf');
  for (const cp of RUSSIAN_CORE) assert.equal(r.has(cp), true, 'Rosencrantz U+' + cp.toString(16));
  assert.deepEqual([...g].sort((a, b) => a - b).filter((c) => c >= 0x0400 && c <= 0x045f),
    [...r].sort((a, b) => a - b).filter((c) => c >= 0x0400 && c <= 0x045f));
});

test('face is single readable weight 400, stack names Guildenstern', () => {
  assert.match(GUILDENSTERN_FACE, /font-weight:400/);
  assert.doesNotMatch(GUILDENSTERN_FACE, /font-weight:100|font-weight:200|font-weight:300/);
  assert.match(GUILDENSTERN_STACK, /Guildenstern/);
});
