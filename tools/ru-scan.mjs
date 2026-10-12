// tools/ru-scan.mjs — механические проверки RU-значений (гейты 4–5 скилла ru-localization-qa).
// Чистый ESM, без зависимостей. Возвращают массив строк-описаний; [] = чисто.

const WORDI = (w) => new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, 'ui');

export function checkYo(s) {
  const out = [];
  if (WORDI('еще').test(s)) out.push('еще без ё');
  if (WORDI('ее').test(s)) out.push('ее без ё (местоимение)');
  const m = s.match(/щ[её]лкн/iu);
  if (m && !m[0].includes('ё') && !m[0].includes('Ё')) out.push('щелкн без ё');
  const v = s.match(/(^|[^\p{L}])(при|у|про|на|во|вы|ото|подо)?шел([^\p{L}]|$)/u);
  if (v && !/ё/u.test(v[0])) out.push('шел без ё');
  // темн-корень без ё — но не затемн* (затемнение — с е) и не темне*
  // (темнеть — с е): «Темный эльф», «темнота» ловим, «Затемнение» — нет.
  if (/(?<!за)темн(?!е)/iu.test(s)) out.push('темн без ё');
  if (/заем/iu.test(s)) out.push('заем без ё');
  if (/запрещенн/iu.test(s)) out.push('запрещенн без ё');
  // затемнённость — с ё (существительное), затемнять — с е (глагол).
  if (/затемненн/iu.test(s)) out.push('затемнн без ё');
  return out;
}

const stripEsc = (s) => String(s).replace(/\\r/g, '');

export function checkMixed(ru, en = '') {
  const r = stripEsc(ru);
  const e = stripEsc(en);
  const m = r.match(/[\p{Script=Cyrillic}][A-Za-z]|[A-Za-z][\p{Script=Cyrillic}]/u);
  if (!m) return [];
  // тот же токен есть в EN (имена, 2D/3D) — не дефект
  const tok = r.slice(Math.max(0, m.index - 8), m.index + 10);
  if (e.includes(tok.trim())) return [];
  return [`mixed-script: ${JSON.stringify(tok)}`];
}

export function checkSpaces(ru, en = '') {
  const out = [];
  // RSC-кавычки EN ('...') — оформление источника, не текст: снять перед сравнением
  const e = String(en).replace(/^'/, '').replace(/'$/, '');
  // промпт "X: " — пробел нужен полю ввода; в EN он сидит перед закрывающей кавычкой
  const promptOk = /: $/.test(ru) && /:$/.test(e);
  if (!promptOk && / $/.test(ru) !== / $/.test(e)) out.push('trailing space mismatch');
  if (/^ /.test(ru) !== /^ /.test(e)) out.push('leading space mismatch');
  const rd = (ru.match(/ {2,}/g) || []).length;
  const ed = (e.match(/ {2,}/g) || []).length;
  if (rd !== ed) out.push('double-space mismatch');
  return out;
}

export function scanValue(ru, en = '') {
  return [...checkYo(ru), ...checkMixed(ru, en), ...checkSpaces(ru, en)];
}

const isForms = (v) => v && typeof v === 'object' && !Array.isArray(v);

export function scanTables(enTables, ruTables) {
  const bad = [];
  for (const [t, o] of Object.entries(ruTables)) {
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'string') {
        const e = enTables[t]?.[k] ?? '';
        const issues = scanValue(v, typeof e === 'string' ? e : '');
        if (issues.length) bad.push({ table: t, key: k, issues });
        continue;
      }
      // Plural-формы {one,few,many}: листья проверяются against EN-листьев.
      if (isForms(v)) {
        const eo = enTables[t]?.[k] ?? {};
        for (const [form, leaf] of Object.entries(v)) {
          if (typeof leaf !== 'string') continue;
          const ee = isForms(eo) ? eo[form] : '';
          const issues = scanValue(leaf, typeof ee === 'string' ? ee : '');
          if (issues.length) bad.push({ table: t, key: `${k}.${form}`, issues });
        }
      }
    }
  }
  return bad;
}
