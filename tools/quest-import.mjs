// Импорт корпуса -LOC (квесты/книги): попарная проверка loc-check,
// вырезание QBN при записи (логика всегда из исходника DFU),
// отчёт по файлам для ревью-очереди. Игнорит файлы без пары в исходниках.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { checkQuestPair, checkBook } from './loc-check.mjs';

export function stripQbn(text) {
  const i = String(text).search(/^QBN:\s*$/m);
  return (i < 0 ? String(text) : String(text).slice(0, i)).replace(/[ \t]+\n/g, '\n').trimEnd() + '\n';
}

export function importCorpus({ srcDir, locDir, outDir, books = false }) {
  mkdirSync(outDir, { recursive: true });
  const rep = { stored: 0, skipped: [], files: [] };
  for (const f of readdirSync(locDir).filter((f) => f.endsWith('-LOC.txt'))) {
    // Книги DFU уже лежат как *-LOC.txt: сначала точное имя, потом strip.
    const cand = exists(join(srcDir, f)) ? f : basename(f, '-LOC.txt') + '.txt';
    const srcPath = join(srcDir, cand);
    if (!exists(srcPath)) { rep.skipped.push(f); continue; }
    const src = readFileSync(srcPath, 'utf8');
    const loc = readFileSync(join(locDir, f), 'utf8');
    const errors = books ? checkBook(src, loc) : checkQuestPair(src, loc);
    writeFileSync(join(outDir, f), books ? loc : stripQbn(loc));
    rep.stored++;
    rep.files.push({ file: f, errors });
  }
  return rep;
}

// Пара есть, если читается: нет файла/прав — пропускаем строкой skipped,
// а не throw на весь корпус.
function exists(p) {
  try { readFileSync(p); return true; } catch { return false; }
}

// CLI: node tools/quest-import.mjs --src <dir> --loc <dir> --out <dir> [--books] [--report <file>]
if (process.argv[1]?.endsWith('quest-import.mjs')) {
  const args = process.argv.slice(2);
  const get = (f) => args[args.indexOf(f) + 1];
  const rep = importCorpus({
    srcDir: get('--src'), locDir: get('--loc'), outDir: get('--out'),
    books: args.includes('--books'),
  });
  const bad = rep.files.filter((f) => f.errors.length);
  const lines = [`stored: ${rep.stored}, skipped(no source): ${rep.skipped.length}, with flags: ${bad.length}`,
    ...bad.flatMap((f) => [`## ${f.file}`, ...f.errors.map((e) => `- ${e}`)])];
  if (get('--report')) writeFileSync(get('--report'), lines.join('\n') + '\n');
  console.log(lines[0]);
}
