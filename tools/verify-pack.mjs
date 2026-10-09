// Проверка собранного пака (гейт релиза): манифест↔файлы, валидный JSON
// без BOM, покрытие ru-таблиц, отсутствие QBN в квестах, магия woff2.
// Возвращает { errors[], stats } — пустые errors = пак здоров.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function verifyPack(dir) {
  const errors = [];
  const stats = { tables: 0, quests: 0, books: 0, ruKeys: 0, enKeys: 0 };
  const manPath = join(dir, 'locale-version.json');
  if (!existsSync(manPath)) return { errors: ['missing locale-version.json'], stats };
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manPath, 'utf8'));
  } catch (e) {
    return { errors: [`locale-version.json invalid: ${e.message}`], stats };
  }
  for (const f of manifest.files ?? []) {
    if (!existsSync(join(dir, f))) errors.push(`manifest lists missing file: ${f}`);
  }
  const ruPath = join(dir, 'ru.json');
  if (existsSync(ruPath)) {
    const raw = readFileSync(ruPath);
    if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) errors.push('ru.json has BOM');
    try {
      const ru = JSON.parse(raw.toString('utf8'));
      stats.tables = Object.keys(ru).length;
      stats.ruKeys = Object.values(ru).reduce((n, t) => n + Object.keys(t).length, 0);
      for (const [table, rows] of Object.entries(ru)) {
        for (const [k, v] of Object.entries(rows)) {
          if (v === '') errors.push(`empty value: ${table}:${k}`);
        }
      }
    } catch (e) {
      errors.push(`ru.json invalid: ${e.message}`);
    }
  } else {
    errors.push('missing ru.json');
  }
  for (const [sub, key] of [['quests', 'quests'], ['books', 'books']]) {
    const d = join(dir, sub);
    let files = [];
    try {
      files = readdirSync(d).filter((f) => f.endsWith('-LOC.txt'));
    } catch {
      errors.push(`missing dir: ${sub}/`);
      continue;
    }
    stats[key] = files.length;
    for (const f of files) {
      const text = readFileSync(join(d, f), 'utf8');
      if (/^QBN:\s*$/m.test(text)) errors.push(`stray QBN logic: ${sub}/${f}`);
    }
  }
  const fonts = (manifest.files ?? []).filter((f) => f.endsWith('.woff2'));
  if (!fonts.length) errors.push('no woff2 in manifest');
  for (const f of fonts) {
    const b = readFileSync(join(dir, f));
    if (b.subarray(0, 4).toString('binary') !== 'wOF2') errors.push(`not woff2: ${f}`);
  }
  return { errors, stats };
}

if (process.argv[1]?.endsWith('verify-pack.mjs')) {
  const dir = process.argv[2] ?? 'dist/ru-pack';
  const rep = verifyPack(dir);
  console.log(`errors: ${rep.errors.length}, stats: ${JSON.stringify(rep.stats)}`);
  for (const e of rep.errors.slice(0, 20)) console.log('- ' + e);
  process.exit(rep.errors.length ? 1 : 0);
}
