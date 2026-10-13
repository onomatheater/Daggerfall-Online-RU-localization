// tools/registry-scan.mjs — надёжный экстрактор реестр-строк (ноль зависимостей).
//
// Замена regex-костылям (3 сбоя подряд: обрезка склеек, якорь $, двойные
// кавычки). Честная RISK-очередь вместо молчаливых потерь: динамика, spread,
// оборванные строки — в risks, никогда не в records.
//
// Что умеет: оба типа кавычек + чистые бэктики, escape (\\' \\" \\\\ \\n \\t
// \\r \\uXXXX \\xXX + сырой UTF-8), склейки через + в начале следующих строк
// (2–N сегментов), путь вложенности (vendor → keys → key).
// Что НЕ умеет (идёт в risks): шаблон с ${}, spread (...), нестатическое
// значение поля, оборванная строка. Тернарник `? 'x' : y` с именем поля —
// известный слепой случай (в реестрах не встречается; AST-сверка держит).
//
// Использование:
//   node tools/registry-scan.mjs <file.js> [--fields description,note]
//   → JSON { records: [{path, field, value, line}], risks: [{line, kind, sample}] }

const DEFAULT_FIELDS = ['description', 'note', 'effect', 'title', 'label', 'what', 'terms'];

function lineOf(src, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (src[i] === '\n') line++;
  return line;
}

// Комментарии — пробелами (переводы строк живые, номера строк едут).
function stripComments(src) {
  let out = '';
  let i = 0;
  while (i < src.length) {
    if (src[i] === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') { out += ' '; i++; }
    } else if (src[i] === '/' && src[i + 1] === '*') {
      out += '  ';
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        out += src[i] === '\n' ? '\n' : ' ';
        i++;
      }
      out += '  ';
      i += 2;
    } else {
      out += src[i];
      i++;
    }
  }
  return out;
}

function decodeEscape(ch, src, i) {
  switch (ch) {
    case 'n': return { text: '\n', len: 1 };
    case 't': return { text: '\t', len: 1 };
    case 'r': return { text: '\r', len: 1 };
    case 'b': return { text: '\b', len: 1 };
    case 'f': return { text: '\f', len: 1 };
    case 'v': return { text: '\v', len: 1 };
    case '0': return { text: '\0', len: 1 };
    case 'u': {
      const hex = src.slice(i, i + 4);
      if (/^[0-9a-fA-F]{4}$/.test(hex)) return { text: String.fromCharCode(parseInt(hex, 16)), len: 4 };
      return { text: 'u', len: 0 };
    }
    case 'x': {
      const hex = src.slice(i, i + 2);
      if (/^[0-9a-fA-F]{2}$/.test(hex)) return { text: String.fromCharCode(parseInt(hex, 16)), len: 2 };
      return { text: 'x', len: 0 };
    }
    default:
      return { text: ch, len: 0 };
  }
}

// Парсит строковый литерал с позиции i (i — на кавычке).
// Возвращает { value, end, dynamic } или { error }.
function parseString(src, i) {
  const quote = src[i];
  const multiline = quote === '`';
  let value = '';
  let j = i + 1;
  while (j < src.length) {
    const ch = src[j];
    if (ch === '\\') {
      const d = decodeEscape(src[j + 1], src, j + 2);
      value += d.text;
      j += 2 + d.len;
      continue;
    }
    if (ch === quote) return { value, end: j + 1, dynamic: false };
    if (quote === '`' && ch === '$' && src[j + 1] === '{') return { dynamic: true, end: j };
    if (!multiline && (ch === '\n' || ch === '\r')) return { error: 'unterminated', end: j };
    value += ch;
    j++;
  }
  return { error: 'unterminated', end: j };
}

function skipWs(src, i) {
  while (i < src.length && /\s/.test(src[i])) i++;
  return i;
}

function readKey(src, i) {
  const ch = src[i];
  if (ch === "'" || ch === '"') {
    const p = parseString(src, i);
    if (p.error || p.dynamic) return null;
    return { key: p.value, end: p.end };
  }
  const m = /^[A-Za-z_$][\w$]*/.exec(src.slice(i));
  if (m) return { key: m[0], end: i + m[0].length };
  return null;
}

export function scanRegistry(src, { fields = DEFAULT_FIELDS } = {}) {
  const want = new Set(fields);
  const text = stripComments(src);
  const records = [];
  const risks = [];
  const stack = []; // [{ key, depth }]
  const containers = []; // [{ brace: '{'|'[', count }]
  let depth = 0;
  let i = 0;

  const risk = (kind, at, sample) => {
    risks.push({ line: lineOf(src, at), kind, sample: String(sample).slice(0, 80) });
  };

  while (i < text.length) {
    const ch = text[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '{' || ch === '[') {
      if (ch === '[') {
        containers.push({ brace: '[', count: 0 });
      } else {
        // Безымянный объект — элемент массива?
        const top = containers[containers.length - 1];
        if (top && top.brace === '[') stack.push({ key: top.count++, depth: depth + 1 });
        containers.push({ brace: '{' });
      }
      depth++;
      i++;
      continue;
    }
    if (ch === '}' || ch === ']') {
      depth--;
      while (stack.length && stack[stack.length - 1].depth > depth) stack.pop();
      while (containers.length && containers.length > depth) containers.pop();
      i++;
      continue;
    }
    if (ch === '.' && text[i + 1] === '.' && text[i + 2] === '.') {
      risk('spread', i, text.slice(i, Math.min(i + 40, text.length)));
      i += 3;
      continue;
    }
    const k = readKey(text, i);
    if (!k) { i++; continue; }
    let j = skipWs(text, k.end);
    if (text[j] !== ':') { i = k.end; continue; }
    j = skipWs(text, j + 1);
    const keyLine = lineOf(src, i);

    if (want.has(k.key)) {
      // Значение поля: статическая строка (+ склейки) или RISK.
      const first = text[j];
      if (first !== "'" && first !== '"' && first !== '`') {
        risk('dynamic-value', i, k.key + ': ' + text.slice(j, j + 30));
        i = j;
        continue;
      }
      let acc = '';
      let end = j;
      let bad = null;
      for (;;) {
        const p = parseString(text, end);
        if (p.error) { bad = p.error; end = p.end; break; }
        if (p.dynamic) { bad = 'dynamic-value'; end = p.end; break; }
        acc += p.value;
        end = p.end;
        const k2 = skipWs(text, end);
        if (text[k2] === '+') { end = skipWs(text, k2 + 1); continue; }
        break;
      }
      if (bad) {
        risk(bad, i, k.key + ': ' + acc.slice(0, 40));
      } else {
        records.push({ path: stack.map((s) => s.key), field: k.key, value: acc, line: keyLine });
      }
      i = end;
      continue;
    }

    // Структурный ключ: открыть объект — положить в стек.
    let v = j;
    if (text.startsWith('Object.freeze', v)) {
      v = skipWs(text, v + 'Object.freeze'.length);
      if (text[v] === '(') v = skipWs(text, v + 1);
    }
    if (text[v] === '{' || text[v] === '[') {
      // Объект за ключом — именованный, индекс не нужен.
      containers.push({ brace: text[v] === '{' ? '{' : '[', count: 0 });
      depth++;
      stack.push({ key: k.key, depth });
      i = v + 1;
      continue;
    }
    i = j;
  }
  return { records, risks };
}

// Сканирование аргументов вызовов: tab("id", "Title", [...]) — заголовки
// реестров, заданные позиционно, а не полями. specs: [{ name, args: [idx] }].
// Статика складывается (включая склейки +), динамика — в risks.
export function scanCalls(src, specs) {
  const text = stripComments(src);
  const want = new Map(specs.map((s) => [s.name, s.args]));
  const records = [];
  const risks = [];
  const risk = (kind, at, sample) => {
    risks.push({ line: lineOf(src, at), kind, sample: String(sample).slice(0, 80) });
  };
  const isWord = (ch) => /[\w$]/.test(ch ?? '');

  // Разбить аргументы вызова: spans с учётом вложенности и строк.
  // Динамический шаблон пропускается целиком (счётчик ${}).
  function skipTemplate(from) {
    let j = from + 1;
    let braces = 0;
    while (j < text.length) {
      const ch = text[j];
      if (ch === '\\') { j += 2; continue; }
      if (ch === '$' && text[j + 1] === '{') { braces++; j += 2; continue; }
      if (ch === '{') { braces++; j++; continue; }
      if (ch === '}') {
        if (braces > 0) braces--;
        j++;
        continue;
      }
      if (ch === '`' && braces === 0) return j + 1;
      j++;
    }
    return j;
  }
  function splitArgs(from) {
    // from — на '('
    const args = [];
    let depth = 0;
    let i = from + 1;
    let start = skipWs(text, i);
    let closed = false;
    while (i < text.length) {
      const ch = text[i];
      if (ch === '(' || ch === '[' || ch === '{') { depth++; i++; continue; }
      if (ch === ')' || ch === ']' || ch === '}') {
        if (depth === 0 && ch === ')') { args.push([start, i]); closed = true; i++; break; }
        depth--;
        i++;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') {
        if (ch === '`') {
          const p = parseString(text, i);
          i = p.dynamic ? skipTemplate(i) : p.end;
          continue;
        }
        const p = parseString(text, i);
        if (p.error) { i = p.end; continue; }
        i = p.end;
        continue;
      }
      if (ch === ',' && depth === 0) {
        args.push([start, i]);
        i++;
        start = skipWs(text, i);
        continue;
      }
      i++;
    }
    return { args, closed };
  }

  // Сложить статическое строковое выражение (литералы через +).
  function foldArg(span) {
    let [s, e] = span;
    let acc = '';
    for (;;) {
      s = skipWs(text, s);
      const q = text[s];
      if (q !== "'" && q !== '"' && q !== '`') return undefined;
      const p = parseString(text, s);
      if (p.error || p.dynamic) return undefined;
      acc += p.value;
      const nx = skipWs(text, p.end);
      if (text[nx] === '+') { s = skipWs(text, nx + 1); continue; }
      // Хвост после литерала — только пробелы до конца span.
      if (skipWs(text, nx) < e) {
        const tail = text.slice(nx, e).trim();
        if (tail.length > 0) return undefined;
      }
      return acc;
    }
    return acc;
  }

  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (/[A-Za-z_$]/.test(ch) && !isWord(text[i - 1]) && text[i - 1] !== '.') {
      const m = /^[A-Za-z_$][\w$]*/.exec(text.slice(i));
      const name = m[0];
      if (want.has(name)) {
        let j = skipWs(text, i + name.length);
        if (text[j] === '(') {
          const { args, closed } = splitArgs(j);
          if (!closed) {
            risk('unterminated', i, name + '(...)');
          } else {
            const first = args.length ? foldArg(args[0]) : undefined;
            const base = first !== undefined ? [name, first] : [name];
            for (const idx of want.get(name)) {
              if (idx >= args.length) {
                risk('missing-arg', i, name + ' arg ' + idx);
                continue;
              }
              const val = foldArg(args[idx]);
              if (val === undefined) {
                risk('dynamic-value', i, name + ' arg ' + idx + ': ' + text.slice(args[idx][0], args[idx][1]).slice(0, 40));
              } else {
                records.push({ path: base, field: 'arg' + idx, value: val, line: lineOf(src, i) });
              }
            }
          }
          i = j + 1;
          continue;
        }
      }
      i += name.length;
      continue;
    }
    i++;
  }
  return { records, risks };
}
const cliArgs = process.argv.slice(2);
if (cliArgs.length > 0 && !cliArgs.includes('--help')) {
  const { readFileSync } = await import('node:fs');
  const file = cliArgs[0];
  const fieldsArg = cliArgs.find((a) => a.startsWith('--fields='));
  const fields = fieldsArg ? fieldsArg.slice('--fields='.length).split(',') : undefined;
  const src = readFileSync(file, 'utf8');
  const out = fields ? scanRegistry(src, { fields }) : scanRegistry(src);
  process.stdout.write(JSON.stringify(out, null, 1) + '\n');
}
