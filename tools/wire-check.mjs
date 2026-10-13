// tools/wire-check.mjs — статический верификатор wiring'а локали.
// Usage: node tools/wire-check.mjs [src-dir]
// Проверяет каждый call-site ruTOr/tOr/ruT/t с литеральным ключом:
//   1. ключ есть в EN-таблице (иначе висячий вызов);
//   2. RU-значение непустое;
//   3. литеральный EN-дефолт байт-в-байт равен EN-таблице (протухший дефолт
//      врёт EN-юзерам и ломает EN-паритет);
//   4. `undefined`-дефолт запрещён (урок tail2: J() смотрел с префиксом);
//   5. плейсхолдеры `{x}` дефолта/params совпадают с табличными.
// Динамические ключи ('dfo:' + x) — варнинги, не ошибки.
// Идемпотентно, без записей. Таблицы — репозиторные (аргумент — только src).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveProbeDir } from './probe-dir.mjs';

const CALLS = ['ruTOr', 'tOr', 'ruT', 't'];

function splitNs(key) {
  const i = key.indexOf(':');
  return i < 0 ? ['strings', key] : [key.slice(0, i), key.slice(i + 1)];
}

function unescapeJs(s) {
  return s.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (m, e) => {
    if (e[0] === 'u') return String.fromCharCode(parseInt(e.slice(1), 16));
    if (e[0] === 'x') return String.fromCharCode(parseInt(e.slice(1), 16));
    const map = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', 0: '\0' };
    return map[e] ?? e;
  });
}

function readString(src, i) {
  // src[i] — кавычка ' " `. Возвращает [rawValue, endIndex] или null.
  // `${}` внутри template'ов — непрозрачные (wire params, не текст).
  const q = src[i];
  let raw = '';
  let j = i + 1;
  while (j < src.length) {
    const c = src[j];
    if (c === '\\' && j + 1 < src.length) { raw += src[j] + src[j + 1]; j += 2; continue; }
    if (c === q) return [unescapeJs(raw), j + 1];
    if (q === '`' && c === '$' && src[j + 1] === '{') {
      let depth = 1;
      let expr = '';
      j += 2;
      while (j < src.length && depth > 0) {
        if (src[j] === '{') depth++;
        else if (src[j] === '}') depth--;
        if (depth > 0) expr += src[j];
        j++;
      }
      raw += `{?${expr.trim()}?}`;
      continue;
    }
    raw += c;
    j++;
  }
  return null;
}

function skipWs(src, i) {
  while (i < src.length && /\s/.test(src[i])) i++;
  return i;
}

function placeholders(s) {
  const text = String(s);
  const pct = (text.match(/%s/g) || []).length;
  const named = [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  return { pct, named };
}

function samePlaceholders(a, b) {
  return a.pct === b.pct && a.named.join(',') === b.named.join(',');
}

function phText(p) {
  return `%s×${p.pct} {${p.named.join(',')}}`;
}

// Модульные `const NAME = 'literal'` файла — для подстановки в template-дефолты
// (`Nothing ${CONFIRM_LABEL}` сворачивается до проверки паритета).
function moduleConsts(src) {
  const out = {};
  const re = /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const body = m[2].slice(1, -1);
    if (!(m[1] in out)) out[m[1]] = unescapeJs(body);
  }
  return out;
}

// `{...}` с учётом вложенности (ruTOr внутри params): возвращает имена
// верхнеуровневых свойств или [] если дальше не объект.
function parseParams(src, i) {
  if (src[i] !== '{') return [];
  let j = i + 1;
  let depth = 1;
  let cur = '';
  const parts = [];
  let quote = null;
  while (j < src.length && depth > 0) {
    const c = src[j];
    if (quote) {
      cur += c;
      if (c === '\\') { cur += src[j + 1] ?? ''; j += 2; continue; }
      if (c === quote) quote = null;
      j++;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; cur += c; j++; continue; }
    if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') {
      depth--;
      if (depth === 0) break;
    }
    // NOTE: упрощение — все скобки одним счётчиком; для params-объектов
    // (плоские {k: v} с вызовами внутри) корректно.
    if (c === ',' && depth === 1) { parts.push(cur); cur = ''; j++; continue; }
    cur += c;
    j++;
  }
  if (depth !== 0) return [];
  parts.push(cur);
  return parts.map((p) => /^\s*(\w+)/.exec(p)?.[1]).filter(Boolean);
}

export function extractCalls(src) {
  // Возвращает [{ key|null(dynamic), def|undefined(absent)|null(undef-literal), params[], index }]
  const out = [];
  const re = /\b(ruTOr|tOr|ruT|t)\s*\(/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    let i = skipWs(src, m.index + m[0].length);
    const at = (ch) => src[i] === ch;
    if (at("'") || at('"') || at('`')) {
      const parsed = readString(src, i);
      if (!parsed) continue;
      const [key, j] = parsed;
      i = skipWs(src, j);
      if (src[i] === '+') {
        out.push({ key: null, def: 'ABSENT', params: [], index: m.index });
        continue;
      }
      let def = 'ABSENT';
      let params = [];
      if (src[i] === ',') {
        i = skipWs(src, i + 1);
        if (src.startsWith('undefined', i)) {
          def = null;
        } else if (at("'") || at('"') || at('`')) {
          const d = readString(src, i);
          if (d) { def = d[0]; i = d[1]; }
          const k = skipWs(src, i);
          if (src[k] === ',') {
            params = parseParams(src, skipWs(src, k + 1));
          }
        }
      }
      out.push({ key, def, params, index: m.index });
    } else {
      out.push({ key: null, def: 'ABSENT', params: [], index: m.index });
    }
  }
  return out;
}

export function checkWiring(files, tables) {
  const errors = [];
  const warnings = [];
  let skipped = 0;
  for (const { name, src } of files) {
    // Без импорта из locale/locale.js вызов t()/tOr() — игровой хелпер
    // (напр. t('stat') в aetheric.js), не локализация. Такие файлы — мимо.
    if (!/from\s+['"][^'"]*locale\/locale\.js['"]/.test(src)) {
      skipped++;
      continue;
    }
    for (const c of extractCalls(src)) {
      const where = `${name}:${c.index}`;
      if (c.key === null) {
        warnings.push(`${where} dynamic key (not statically checkable)`);
        continue;
      }
      const [table, key] = splitNs(c.key);
      const enVal = tables.en?.[table]?.[key];
      const ruVal = tables.ru?.[table]?.[key];
      if (enVal === undefined) {
        errors.push(`${where} missing key: ${c.key}`);
        continue;
      }
      if (typeof ruVal !== 'string' || ruVal.length === 0) {
        errors.push(`${where} missing RU: ${c.key}`);
      }
      if (c.def === null) {
        errors.push(`${where} undefined default: ${c.key}`);
        continue;
      }
      // Template-дефолты сворачиваем через модульные константы до сравнения.
      const consts = moduleConsts(src);
      const def = c.def === 'ABSENT'
        ? 'ABSENT'
        : c.def.replace(/\{\?([^{}]+)\?\}/g, (m, e) => (e.trim() in consts ? consts[e.trim()] : '{?}'));
      if (def !== 'ABSENT' && def !== enVal) {
        errors.push(`${where} stale default: ${c.key} (call has ${JSON.stringify(c.def.slice(0, 60))})`);
      }
      if (def !== 'ABSENT') {
        const want = placeholders(enVal);
        if (!samePlaceholders(placeholders(def), want)) {
          errors.push(`${where} placeholder mismatch: ${c.key} (table {${phText(want)}})`);
        } else if (c.params.length) {
          const pset = new Set(c.params);
          const namedOk = want.named.every((n) => pset.has(n));
          const countOk = want.pct === 0
            ? c.params.length === want.named.length
            : c.params.length === want.pct + want.named.length;
          if (!namedOk || !countOk) {
            errors.push(`${where} placeholder mismatch: ${c.key} (table {${phText(want)}})`);
          }
        }
        if (ruVal !== undefined && !samePlaceholders(placeholders(ruVal), want)) {
          errors.push(`${where} RU placeholder mismatch: ${c.key}`);
        }
      }
    }
  }
  return { errors, warnings };
}

function collectJs(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'dist') walk(p); }
      else if (e.name.endsWith('.js') || e.name.endsWith('.cjs')) out.push({ name: path.relative(dir, p), src: fs.readFileSync(p, 'utf8') });
    }
  };
  walk(dir);
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const srcDir = resolveProbeDir(process.argv[2]);
  const here = path.dirname(fileURLToPath(import.meta.url));
  const en = JSON.parse(fs.readFileSync(path.join(here, '../src/locale/en.json'), 'utf8'));
  const ru = JSON.parse(fs.readFileSync(path.join(here, '../src/locale/ru.json'), 'utf8'));
  const { errors, warnings } = checkWiring(collectJs(srcDir), { en, ru });
  for (const e of errors) console.log('WIRE-ERR ' + e);
  console.log(warnings.length ? `(${warnings.length} dynamic-key warnings)` : '(no dynamic keys)');
  console.log(errors.length === 0 ? 'WIRE-CHECK OK' : `WIRE-CHECK FAIL: ${errors.length} errors`);
  process.exit(errors.length === 0 ? 0 : 1);
}
