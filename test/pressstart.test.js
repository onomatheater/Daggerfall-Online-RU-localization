// NEED: Press Start 2P в окне — только 400 (других весов нет),
// кириллица проверена парсером woff2->TTF->cmap, не на глаз.
// Решение человека 12.10: шрифт в заголовки окна апдейтера (OFL, Google Fonts).
// Лицензия: updater/launcher/fonts/OFL-PressStart2P.txt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// woff2 -> TTF деcompress — wawoff2 (WASM, dep приложения); cmap-парсинг свой.
async function ttfOf(file) {
  const raw = readFileSync(new URL(`../updater/launcher/fonts/${file}`, import.meta.url));
  assert.equal(raw.subarray(0, 4).toString('binary'), 'wOF2', `${file}: магия woff2`);
  const { decompress } = await import('../updater/node_modules/wawoff2/index.js');
  const out = await decompress(new Uint8Array(raw));
  if (!out) throw new Error(`${file}: wawoff2 не распаковал`);
  return Buffer.from(out);
}

const RUSSIAN_CORE = [];
for (let cp = 0x0410; cp <= 0x044f; cp++) RUSSIAN_CORE.push(cp);
RUSSIAN_CORE.push(0x0401, 0x0451); // Ёё

function cmapSet(ttf, fileName) {
  const u16 = (o) => ttf.readUInt16BE(o);
  const u32 = (o) => ttf.readUInt32BE(o);
  const numTables = u16(4);
  let cmapOff = 0;
  for (let i = 0; i < numTables; i++) {
    const o = 12 + i * 16;
    if (ttf.toString('ascii', o, o + 4) === 'cmap') { cmapOff = u32(o + 8); break; }
  }
  assert.notEqual(cmapOff, 0, `${fileName}: есть таблица cmap`);
  const set = new Set();
  const n = u16(cmapOff + 2);
  for (let i = 0; i < n; i++) {
    const o = cmapOff + 4 + i * 8;
    const platform = u16(o);
    const encoding = u16(o + 2);
    const sub = cmapOff + u32(o + 4);
    const format = u16(sub);
    if (!((platform === 3 && encoding === 1) || (platform === 0 && encoding === 3))) continue;
    if (format === 4) {
      const segCount = u16(sub + 6) / 2;
      const endBase = sub + 14;
      const startBase = endBase + segCount * 2 + 2;
      const deltaBase = startBase + segCount * 2;
      const rangeBase = deltaBase + segCount * 2;
      for (let s = 0; s < segCount; s++) {
        const end = u16(endBase + s * 2);
        const start = u16(startBase + s * 2);
        const delta = u16(deltaBase + s * 2);
        const rangeOff = u16(rangeBase + s * 2);
        for (let cp = start; cp <= end; cp++) {
          let gid;
          if (rangeOff === 0) gid = (cp + delta) & 0xffff;
          else {
            gid = u16(rangeBase + s * 2 + rangeOff + (cp - start) * 2);
            if (gid !== 0) gid = (gid + delta) & 0xffff;
          }
          if (gid !== 0) set.add(cp);
        }
        if (end === 0xffff) break;
      }
    } else if (format === 12) {
      const groups = u32(sub + 12);
      for (let g = 0; g < groups; g++) {
        const o2 = sub + 16 + g * 12;
        for (let cp = u32(o2); cp <= u32(o2 + 4); cp++) set.add(cp);
      }
    }
  }
  return set;
}

test('press start 2p cyrillic covers full Russian core incl. Ёё', async () => {
  const set = cmapSet(await ttfOf('pressstart-cyrillic-400.woff2'), 'cyrillic');
  const missing = RUSSIAN_CORE.filter((cp) => !set.has(cp));
  assert.deepEqual(missing, [], `нет глифов: ${missing.map((c) => c.toString(16)).join(',')}`);
});

test('press start 2p license vendored, weight only 400', () => {
  const ofl = readFileSync(new URL('../updater/launcher/fonts/OFL-PressStart2P.txt', import.meta.url), 'utf8');
  assert.match(ofl, /SIL OPEN FONT LICENSE/i);
});
