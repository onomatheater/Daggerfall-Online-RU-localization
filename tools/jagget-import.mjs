// Импорт CSV Jagget (Key,Value) в ru.json. Источник пинится на коммит:
// https://github.com/Jagget/Daggerfall-Rus @ 56ab614984a70f40fcb55be3d7233909151ccbed
// Ключи никогда не переименовываем, только Value. BOM срезаем, переводы
// строк внутри кавычек — часть значения (DFU-правило для RSC учтено
// вызывающей стороной, здесь сырой Value).
export const JAGGET_PIN = '56ab614984a70f40fcb55be3d7233909151ccbed';
const JAGGET_BASE = `https://raw.githubusercontent.com/Jagget/Daggerfall-Rus/${JAGGET_PIN}`;

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
    // Пропуск пустых строк между записями
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
  let rec;
  while ((rec = readRecord()) !== null) {
    if (rec.length === 1 && rec[0] === '') continue;
    rows.push({ key: rec[0], value: rec.slice(1).join(',') });
  }
  return rows;
}

export function csvToJson(rows) {
  const out = {};
  for (const { key, value } of rows) {
    if (!key || key === 'Key') continue;
    out[key] = value;
  }
  return out;
}

// CLI: node tools/jagget-import.mjs --src <csv> --out <json> [--merge <json>]
if (process.argv[1]?.endsWith('jagget-import.mjs')) {
  const { readFileSync, writeFileSync } = await import('node:fs');
  const args = process.argv.slice(2);
  const get = (f) => args[args.indexOf(f) + 1];
  const base = get('--merge') ? JSON.parse(readFileSync(get('--merge'), 'utf8')) : {};
  const rows = parseCsv(readFileSync(get('--src'), 'utf8'));
  writeFileSync(get('--out'), JSON.stringify({ ...base, ...csvToJson(rows) }, null, 2) + '\n');
  console.log(`imported ${rows.length} rows -> ${get('--out')}`);
}
