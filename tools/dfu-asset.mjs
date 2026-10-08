// Парсер Unity StringTable .asset (DFU, MIT): Shared Data даёт Id→Key,
// *_en.asset даёт Id→EN-строку. joinTable склеивает в Key→EN для en.json.
// Многострочные m_Localized склеиваем пробелом (редакторный воздух, как и
// буквальные \n в CSV DFU-конвертера).
export function parseShared(text) {
  const out = {};
  const re = /- m_Id:\s*(\d+)\s*\n\s*m_Key:\s*(\S+)/g;
  let m;
  while ((m = re.exec(String(text)))) out[m[1]] = m[2];
  return out;
}

export function parseTable(text) {
  const out = {};
  const lines = String(text).split('\n');
  let id = null;
  let buf = null;
  const flush = () => {
    if (id !== null && buf !== null) out[id] = buf.join(' ').trim();
    id = null; buf = null;
  };
  for (const line of lines) {
    let m = line.match(/^\s*-\s*m_Id:\s*(\d+)\s*$/);
    if (m) { flush(); id = m[1]; continue; }
    m = line.match(/^\s*m_Localized:\s?(.*)$/);
    if (m && id !== null) { buf = [m[1]]; continue; }
    m = line.match(/^\s*m_Metadata:/);
    if (m) { flush(); continue; }
    if (buf !== null && /^\s+\S/.test(line) && !/^\s*m_/.test(line)) buf.push(line.trim());
  }
  flush();
  return out;
}

export function joinTable(shared, table) {
  const out = {};
  for (const [id, key] of Object.entries(shared)) {
    if (table[id] !== undefined) out[key] = table[id];
  }
  return out;
}
