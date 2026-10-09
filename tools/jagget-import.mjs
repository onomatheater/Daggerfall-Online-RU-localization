// Импорт CSV Jagget (Key,Value[,Original]) в namespaced JSON.
// Источник пинится на коммит:
// https://github.com/Jagget/Daggerfall-Rus @ 56ab614984a70f40fcb55be3d7233909151ccbed
// Ключи никогда не переименовываем, только Value. BOM срезаем. Третья
// колонка Original (есть у Spells/Factions/MagicItems) — это английский
// оригинал DFU, идёт в en-таблицу как fallback. Разные таблицы живут в
// своих неймспейсах: items:1 и spells:1 — разные строки.
export const JAGGET_PIN = '56ab614984a70f40fcb55be3d7233909151ccbed';

export function parseCsv(text) {
  const src = String(text ?? '').replace(/^﻿/, '');
  const rows = [];
  let i = 0;
  const n = src.length;
  const readRecord = () => {
    const fields = [];
    let field = '';
    let inQuotes = false;
    if (i >= n) return null;
    if (src[i] === '\r' || src[i] === '\n') {
      i += src[i] === '\r' && src[i + 1] === '\n' ? 2 : 1;
      return readRecord();
    }
    while (i < n) {
      const ch = src[i];
      if (inQuotes) {
        if (ch === '"') {
          if (src[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += ch; i++; continue;
      }
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === ',') { fields.push(field); field = ''; i++; continue; }
      if (ch === '\r' || ch === '\n') {
        fields.push(field);
        i += ch === '\r' && src[i + 1] === '\n' ? 2 : 1;
        return fields;
      }
      field += ch; i++;
    }
    fields.push(field);
    return fields;
  };
  const header = readRecord();
  if (!header || header[0] !== 'Key') throw new Error('expected Key,Value header');
  const hasOrig = header[2] === 'Original';
  let rec;
  while ((rec = readRecord()) !== null) {
    if (rec.length === 1 && rec[0] === '') continue;
    rows.push({ key: rec[0], value: rec[1] ?? '', ...(hasOrig ? { orig: rec[2] ?? '' } : {}) });
  }
  return rows;
}

export function csvToJson(rows) {
  const ru = {};
  const en = {};
  for (const { key, value, orig } of rows) {
    if (!key || key === 'Key') continue;
    ru[key] = value;
    if (orig) en[key] = orig;
  }
  return { ru, en };
}

// Откат импорта: если автор запретит таблицу или ответ разработчиков
// потребует её убрать — одна команда, остальное не трогаем.
export function dropTable(all, table) {
  const out = { ...(all ?? {}) };
  delete out[table];
  return out;
}

// CLI: node tools/jagget-import.mjs --src <csv> --table <name>
//      --ru <ru.json> --en <en.json>
//      node tools/jagget-import.mjs --drop <name> --ru <ru.json> --en <en.json>
if (process.argv[1]?.endsWith('jagget-import.mjs')) {
  const { readFileSync, writeFileSync } = await import('node:fs');
  const args = process.argv.slice(2);
  const get = (f) => args[args.indexOf(f) + 1];
  if (args.includes('--drop')) {
    const table = get('--drop');
    for (const f of [get('--ru'), get('--en')].filter(Boolean)) {
      writeFileSync(f, JSON.stringify(dropTable(JSON.parse(readFileSync(f, 'utf8')), table), null, 2) + '\n');
    }
    console.log(`dropped table ${table}`);
    process.exit(0);
  }
  const table = get('--table') || 'strings';
  const { ru, en } = csvToJson(parseCsv(readFileSync(get('--src'), 'utf8')));
  const ruAll = JSON.parse(readFileSync(get('--ru'), 'utf8'));
  const enAll = JSON.parse(readFileSync(get('--en'), 'utf8'));
  ruAll[table] = { ...(ruAll[table] ?? {}), ...ru };
  enAll[table] = { ...(enAll[table] ?? {}), ...en };
  writeFileSync(get('--ru'), JSON.stringify(ruAll, null, 2) + '\n');
  writeFileSync(get('--en'), JSON.stringify(enAll, null, 2) + '\n');
  console.log(`imported ${Object.keys(ru).length} rows -> ${table} (+${Object.keys(en).length} en-orig)`);
}
