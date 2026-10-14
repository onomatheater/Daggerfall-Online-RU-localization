// tools/menu-cover.mjs — 0-missing guard for menu-scope UI files.
// Usage: node tools/menu-cover.mjs [dfjs-src-dir]
// Exit 0: every display string in the menu scope is covered by dfo tables.
// Exit 1: lists misses (new upstream strings needing a batch).
// Idempotent, no writes. Search-index/code-const verdicts live in
// docs/outbox/menu-review.md and are excluded here with reason.
import { extractTexts } from './extract-texts.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveProbeDir } from './probe-dir.mjs';

// verdicts from docs/outbox/menu-review.md (code, not display text)
export const SKIP_STRINGS = new Set([
  'quality preset graphics low medium high ultra performance',
  'overhauls looks textures vanilla enhanced sounds interface',
  'key bindings keys keyboard rebind controls',
  'morrowind files data body 3d attach',
  'packs textures music replacement folder',
  'other players look sprites',
  'night sounds crickets howl',
  'Modules.',
]);

export const MENU_SCOPE = [
  'ui/enhancedMenu.js', 'ui/shotsPane.js', 'ui/saveWindow.js', 'ui/saveTile.js',
  'ui/pauseWindow.js', 'ui/settingsMap.js', 'ui/lookSettings.js',
  'ui/viewSettings.js', 'ui/messageBox.js', 'ui/decisionBox.js',
  'ui/yesNoBox.js', 'ui/inputMessageBox.js', 'ui/startWindow.js',
  'ui/titleScreen.js',
];

export function coverReport(dfjsDir, haveSet) {
  // extractor trims literals, so repo EN with meaningful trailing space
  // (e.g. menu.show_travellers "...map. ") matches by trimEnd on both sides.
  // Pure trailing-space drift is owned by the EN-sync procedure, not coverage.
  const haveTrimmed = new Set([...haveSet].map((s) => String(s).trimEnd()));
  const misses = [];
  for (const f of MENU_SCOPE) {
    const p = path.join(dfjsDir, f);
    if (!fs.existsSync(p)) { misses.push({ file: f, line: 0, en: '<NO FILE>' }); continue; }
    const src = fs.readFileSync(p, 'utf8');
    for (const r of extractTexts(src, 'x', { file: 'src/' + f.replace(/\\/g, '/') })
      .filter((x) => !SKIP_STRINGS.has(x.en) && !haveTrimmed.has(x.en))) {
      // risk-flagged rows are NOT misses (review queue owns them) but they
      // must be visible: a silent filter is a blind spot for placeholder
      // strings (saveTile plurals class). Callers split on m.risk.
      misses.push({ file: f, line: r.line, en: r.en, risk: r.risk ?? null });
    }
  }
  return misses;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dfjsDir = resolveProbeDir(process.argv[2]);
  const en = JSON.parse(fs.readFileSync(new URL('../src/locale/en.json', import.meta.url), 'utf8'));
  const misses = coverReport(dfjsDir, new Set(Object.values(en.dfo)));
  const hard = misses.filter((m) => !m.risk);
  const risky = misses.filter((m) => m.risk);
  for (const m of hard) console.log(`MISS ${m.file}:${m.line} | ${JSON.stringify(String(m.en).slice(0, 80))}`);
  for (const m of risky) console.log(`RISK(${m.risk}) ${m.file}:${m.line} | ${JSON.stringify(String(m.en).slice(0, 80))}`);
  console.log(hard.length === 0 ? `MENU-COVER OK (${risky.length} review-risk noted)` : `MENU-COVER FAIL: ${hard.length} missing`);
  process.exit(hard.length === 0 ? 0 : 1);
}
