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
      if (quote === '`' && c === '$' && source[i + 1] === '{') {
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
      if (c === '\\' && i + 1 < n) { buf += source[i + 1]; i += 2; continue; }
      if (c === quote) { closed = true; i++; break; }
      if (quote !== '`' && (c === '\n' || c === '\r')) break; // обрыв — не строка
      buf += c;
      i++;
    }
    if (closed) out.push({ raw: buf, index: start });
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
        out.push({ raw: buf, index: i + 1 });
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
  if (/^[a-z]+(-[a-z0-9]+)+$/.test(s)) return true; // lowercase-дефис без пробелов (классы)
  if (/^[a-z_$][\w$]*$/.test(s)) return true; // чистый код-идентификатор
  if (/^\.[A-Za-z_-]/.test(s) && !/\s/.test(s)) return true; // селектор (.px-x)
  if (!/\s/.test(s) && /^[A-Za-z_$][\w$]*(\.[\w$]+)+$/.test(s)) return true; // dotted-ID (menu.x)
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
  if (/el\(\s*(['"])[^'"]*\1\s*,\s*['"]?$/.test(back)) {
    return /^[a-z0-9][a-z0-9-]*(\s+[a-z0-9][a-z0-9-]*)*$/.test(en);
  }
  return false;
}

export function extractTexts(source, page = 'page') {
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
