// tools/extract-texts.mjs — извлечь транслируемые строки экрана → [{ key, en, line }].
// Чистый ESM, без зависимостей. Токенизатор: кавычки с экранированием,
// комменты // и /* */ вырезаются, ${} в шаблонах пропускаются.
// Безопасная сторона: сомнительное (ID, классы, код) пропускаем —
// пропущенная строка = fallback EN, а переведённый ID = сломанная игра.
export function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .slice(0, 48);
}

// Сканирует исходник, отдаёт сырые строковые литералы (кавычки/теги).
// Возвращает [{ raw, index }] — сырые, без трима.
function unescapeJs(s) {
  return s.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/gs, (m, g) => {
    if (g.startsWith('u')) return String.fromCharCode(parseInt(g.slice(1), 16));
    if (g.startsWith('x')) return String.fromCharCode(parseInt(g.slice(1), 16));
    const one = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', 0: '\0' };
    return one[g] ?? g;
  });
}
function scan(source) {
  const out = [];
  const n = source.length;
  let i = 0;
  const pushQuoted = (quote) => {
    // i указывает на открывающую кавычку
    const start = i;
    i++;
    let buf = '';
    let closed = false;
    while (i < n) {
      const c = source[i];
      if (quote === '`' && c === '$' && source[i + 1] === '{' && source[i - 1] !== '\\') {
        // ${...} с учётом вложенности — пропускаем целиком
        let depth = 0;
        while (i < n) {
          if (source[i] === '{') depth++;
          else if (source[i] === '}') {
            depth--;
            if (depth === 0) { i++; break; }
          } else if (source[i] === "'" || source[i] === '"' || source[i] === '`') {
            // вложенная строка внутри ${} — перепрыгнуть аккуратно нельзя дёшево;
            // выходим: остаток доберёт внешний цикл как новый литерал
            break;
          }
          i++;
        }
        buf += '\u0000';
        continue;
      }
      if (c === '\\' && i + 1 < n) { buf += c + source[i + 1]; i += 2; continue; }
      if (c === quote) { closed = true; i++; break; }
      if (quote !== '`' && (c === '\n' || c === '\r')) break; // обрыв — не строка
      buf += c;
      i++;
    }
    if (closed) out.push({ raw: unescapeJs(buf), index: start, end: i, quote });
  };
  while (i < n) {
    const c = source[i];
    const nx = source[i + 1];
    if (c === '/' && nx === '/') {
      while (i < n && source[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && nx === '*') {
      i += 2;
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { pushQuoted(c); continue; }
    // текст между тегами: >text< (HTML-поверхности)
    if (c === '>') {
      let j = i + 1;
      let buf = '';
      while (j < n && source[j] !== '<' && source[j] !== '>' && buf.length < 160) {
        buf += source[j];
        j++;
      }
      if (j < n && source[j] === '<' && /[A-Za-zА-Яа-яЁё]/.test(buf)) {
        out.push({ raw: buf, index: i + 1, end: j, quote: '>' });
      }
      i++;
      continue;
    }
    i++;
  }
  return out;
}

function isSkippable(raw) {
  const s = String(raw).replace(/\u0000/g, '').trim();
  if (!s) return true;
  if (s.startsWith('dfo:')) return true; // уже ключ
  if (/^QBN:/i.test(s)) return true; // логика квестов — не трогаем
  if (/^(https?:|\.\.?\/\/|\.\.?\/|[/\\])/.test(s)) return true; // url/путь
  if (/[/\\].*\./.test(s)) return true; // путь с расширением
  if (!/[A-Za-zА-Яа-яЁё]/.test(s)) return true; // без букв — не текст
  if (!/[A-Za-zА-Яа-яЁё]{2}/.test(s)) return true; // короче двух букв подряд
  if (/\s/.test(s) === false && /[:/]/.test(s)) return true; // ID без пробелов (Section/Key, a:1)
  if (/^(aria|data)-[a-z-]+$/i.test(s)) return true; // имена атрибутов
  if (/^-*[a-z][a-z0-9_$-]*$/.test(s)) return true; // одиночный строчный токен (классы, идентификаторы, css-переменные)
  const toks = s.split(/\s+/);
  if (toks.length <= 3 && toks.length > 1 && toks.every((t) => /^[a-z0-9][a-z0-9-]*$/.test(t)) && toks.some((t) => t.includes('-'))) return true; // class-комбо (px-a px-b)
  if (!/\s/.test(s) && /[a-z][A-Z]/.test(s)) return true; // camelCase-ID (MoveForwards)
  if (/^\.[A-Za-z_-]/.test(s) && !/\s/.test(s)) return true; // селектор (.px-x)
  if (!/[A-Z]/.test(s) && /(\.\w|#\w|\bbody\s)/.test(s)) return true; // селектор-комбинатор (body .x)
  if (/^#[0-9a-f]{3,8}$/i.test(s)) return true; // hex-цвет
  if (/^[\s.kfybo#]{8,}$/.test(s)) return true; // пиксель-арт (......kkkk......)
  if (!/\s/.test(s) && /[.]/u.test(s) && !/^([A-Z][a-z]*\.)+$/.test(s)) return true; // dotted-ID (menu.x, A.CIF_1-0, 1.7.1)
  if (/^(TODO|FIXME|XXX)\b/.test(s) || /^NOTE:/.test(s)) return true; // dev-пометки
  if (/\b\d+(\.\d+)?px\b/.test(s)) return true; // font-шорткат (700 11px ...)
  const core = s.replace(/[?!…]+$/u, '');
  if (/[=<>!&|?;:(){}\[\]\\]/.test(core)) return true; // обрывки кода
  return false;
}

// Позиция «классового» литерала: селектор/тег в querySelector,
// значение class=/classList.add — всегда пропуск; 2-й аргумент
// el('tag', 'class', ...) — пропуск только class-shaped (строчные):
// el('button','Cancel') — текст, его не трогаем.
function inClassSlot(source, index, en) {
  const back = source.slice(Math.max(0, index - 80), index);
  if (/querySelector(All)?\(\s*['"]\.?$/.test(back)) return true;
  if (/class\s*=\s*['"]?$/.test(back)) return true;
  if (/classList\.\s*add\s*\(\s*['"]?$/.test(back)) return true;
  if (/console\.\s*(log|warn|error|debug|info|trace)\s*\(\s*['"]?$/.test(back)) return true;
  if (/throw\s+new\s+Error\s*\(\s*['"]?$/.test(back)) return true;
  if (/(^|[^\w$])new\s+Error\s*\(\s*['"]?$/.test(back)) return true;
  if (/\bassert\w*\([^()]*,\s*['"]?$/.test(back)) return true;
  if (/createElement\s*\(\s*['"]?$/.test(back)) return true;
  if (/el\(\s*(['"])[^'"]*\1\s*,\s*['"]?$/.test(back)) {
    return /^[a-z0-9][a-z0-9-]*(\s+[a-z0-9][a-z0-9-]*)*$/.test(en);
  }
  return false;
}

// Слой показа: по умолчанию берём всё, но звать надо с opts { file, include } —
// таблицы данных (items/materials), квест-макросы, бинды, контент диалогов
// идут своими пайплайнами (DFU-таблицы, -LOC), а не dfo-ключами.
export function inScope(file = '', include = null) {
  if (!include) return true;
  return include.some((dir) => file.includes(dir));
}

export function extractTexts(source, page = 'page', opts = {}) {
  if (opts.file && opts.include && !inScope(opts.file, opts.include)) return [];
  const found = new Map(); // en -> { key, en, line }
  const usedSlugs = new Set();
  for (const { raw, index } of scan(source)) {
    const en = String(raw).replace(/\u0000/g, '').trim();
    if (isSkippable(en) || inClassSlot(source, index, en) || found.has(en)) continue;
    let slug = slugify(en) || 'text';
    let uniq = slug;
    let k = 2;
    while (usedSlugs.has(uniq)) uniq = `${slug}_${k++}`;
    usedSlugs.add(uniq);
    const line = source.slice(0, index).split('\n').length;
    found.set(en, { key: `dfo:${page}.${uniq}`, en, line });
  }
  return [...found.values()];
}

// Перепись исходника: дисплейные литералы → ruT('dfo:page.slug').
// Возвращает { code, table } — table только переписанное (для en.json).
// Не трогает: слоты классов, dev-строки, шаблоны ${}, тексты тегов, FONT/shorthand.
// Идемпотентен: повторный прогон — no-op.
// Слой показа по умолчанию: только UI-поверхности. Таблицы данных,
// квест-макросы, бинды, контент диалогов идут своими пайплайнами.
export const UI_SCOPE = ['src/ui/', 'src\\ui\\'];

export function rewriteFile(source, page = 'page', opts = {}) {
  if (!opts.file) throw new Error('rewriteFile: opts.file required (scope guard)');
  const include = opts.include ?? UI_SCOPE;
  const importFrom = opts.importFrom ?? '../locale/locale.js';
  const rows = extractTexts(source, page, { ...opts, include });
  const byEn = new Map(rows.map((r) => [r.en, r.key]));
  const edits = []; // { start, end, text }
  const table = [];
  const tabled = new Set();
  for (const { raw, index, end, quote } of scan(source)) {
    if (quote === '>') continue; // текст тега — не код
    if (String(raw).includes('\u0000')) continue; // шаблон с ${} — руками
    const en = String(raw).replace(/\u0000/g, '').trim();
    const key = byEn.get(en);
    if (!key) continue;
    if (inClassSlot(source, index, en)) continue;
    const call = `ruT('${key}')`;
    edits.push({ start: index, end, text: call });
    if (!tabled.has(key)) {
      tabled.add(key);
      table.push({ key, en, line: source.slice(0, index).split('\n').length });
    }
  }
  // сплайс с конца, чтобы индексы не плыли
  let code = source;
  edits.sort((a, b) => b.start - a.start);
  for (const e of edits) code = code.slice(0, e.start) + e.text + code.slice(e.end);
  if (edits.length > 0 && !/\bt\s+as\s+ruT\b/.test(code)) {
    code = `import { t as ruT } from '${importFrom}';\n` + code;
  }
  return { code, table };
}
