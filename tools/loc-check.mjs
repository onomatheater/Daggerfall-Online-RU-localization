// Валидатор -LOC переводов (квесты/книги) по паре источник→перевод.
// Правила из DFU-вики и AGENTS.md: QRC: переводится, QBN: не шиппится
// (логика всегда из исходника); макросы %xxx, Message:-id, разбивка <-->
// и книжная разметка [/...] обязаны пережить перевод один в один.
// Работает на синтетике здесь; на реальные файлы Jagget пойдёт той же
// функцией, когда будет разрешение.
const MACRO = /%[a-zA-Z0-9]+/g;
// Разметка: сравниваем ИМЕНА тегов (center, font, color...), не значения:
// номер [/font=N] переводчик вправе менять под длину строк (совет DFU-вики),
// а ронять или добавлять теги — нет.
const MARKUP = /\[\/([a-zA-Z]+)[^\]]*\]/g;

const macrosOf = (s) => new Set([...String(s).matchAll(MACRO)].map((m) => m[0]));
const markupsOf = (s) => [...new Set([...String(s).matchAll(MARKUP)].map((m) => m[1]))].sort();

function section(text, name) {
  const m = String(text).split(new RegExp(`^${name}:\\s*$`, 'm'));
  if (m.length < 2) return '';
  return m[1].split(/^[A-Z]+:\s*$/m)[0];
}

export function checkQuestPair(src, loc) {
  const errs = [];
  if (!/^QRC:\s*$/m.test(loc)) errs.push('missing QRC: section');
  if (/^QBN:\s*$/m.test(loc) && section(loc, 'QBN').trim()) {
    errs.push('QBN: logic must not be shipped (delete the section, logic comes from source)');
  }
  const srcIds = [...src.matchAll(/^Message:\s*(\d+)/gm)].map((m) => m[1]).sort();
  const locIds = [...loc.matchAll(/^Message:\s*(\d+)/gm)].map((m) => m[1]).sort();
  if (JSON.stringify(srcIds) !== JSON.stringify(locIds)) {
    errs.push(`Message: ids differ (src ${srcIds} vs loc ${locIds})`);
  }
  const strip = (s) => String(s).split('\n').filter((l) => !/^\s*--/.test(l)).join('\n');
  const srcQrc = strip(section(src, 'QRC'));
  const locQrc = strip(section(loc, 'QRC'));
  for (const mc of macrosOf(srcQrc)) {
    const need = srcQrc.split(mc).length - 1;
    const got = locQrc.split(mc).length - 1;
    if (got < need) errs.push(`lost macro ${mc} (need ${need}, got ${got})`);
  }
  const srcVars = srcQrc.split('<-->').length;
  const locVars = locQrc.split('<-->').length;
  if (srcVars !== locVars) errs.push(`variant count differs (<-->: src ${srcVars} vs loc ${locVars})`);
  const sm = JSON.stringify(markupsOf(srcQrc));
  if (JSON.stringify(markupsOf(locQrc)) !== sm) errs.push('markup set differs in QRC');
  return errs;
}

const BIOG_LOGIC = /^\s*(#|!|\d+\s*[+-]|GP\s*[+-]|IT\s|AE\s|AF\s|AO\s|RP\s|FT\s|RR\s|RD\s|MR\s|TH\s|r\d|rf\d)/;
const BIOG_QNUM = /^(\d+)\./;
const BIOG_LETTER = /^([a-z])\.\t?/;

const normEnd = (s) => String(s).replace(/\r\n/g, '\n');

// BIOG-пары (создание персонажа): строгий формат классики — число строк
// 1:1 (парсер читает фиксированные строки), строки логики (#/!/коды
// эффектов) байт-в-байт, номера вопросов и буквы ответов на месте.
// Переводится только проза (вопросы + текст ответов вокруг префиксов).
export function checkBiogPair(src, loc) {
  const errs = [];
  const s = normEnd(src).split('\n');
  const l = normEnd(loc).split('\n');
  if (s.length !== l.length) errs.push(`line count differs (src ${s.length} vs loc ${l.length})`);
  const n = Math.min(s.length, l.length);
  let srcQuestions = 0;
  let locQuestions = 0;
  for (let i = 0; i < n; i++) {
    const sl = s[i];
    const ll = l[i];
    if (BIOG_LOGIC.test(sl)) {
      if (ll !== sl) errs.push(`logic drift line ${i + 1}: ${JSON.stringify(sl)} vs ${JSON.stringify(ll)}`);
      continue;
    }
    const sq = sl.match(BIOG_QNUM);
    const lq = ll.match(BIOG_QNUM);
    if (sq) srcQuestions++;
    if (lq) locQuestions++;
    if (sq) {
      if (!lq || lq[1] !== sq[1]) errs.push(`question number drift line ${i + 1}`);
      continue;
    }
    const sa = sl.match(BIOG_LETTER);
    if (sa) {
      const la = ll.match(BIOG_LETTER);
      if (!la || la[1] !== sa[1]) errs.push(`answer letter drift line ${i + 1} (need ${sa[1]})`);
      continue;
    }
    if (sl.trim() === '' && ll.trim() === '') continue;
    if (sl.trim() === '' || ll.trim() === '') errs.push(`blank drift line ${i + 1}`);
  }
  if (srcQuestions !== locQuestions) errs.push(`question count differs (src ${srcQuestions} vs loc ${locQuestions})`);
  const tail = (t) => {
    const lines = String(t).replace(/\r\n/g, '\n').split('\n');
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    return lines.pop() ?? '';
  };
  if (tail(src) !== tail(loc)) errs.push(`EOF tail differs (${JSON.stringify(tail(src))} vs ${JSON.stringify(tail(loc))})`);
  return errs;
}

export function checkBook(src, loc) {
  const errs = [];
  for (const tag of ['Title:', 'Author:']) {
    const s = src.split('\n').find((l) => l.startsWith(tag));
    const l = loc.split('\n').find((l) => l.startsWith(tag));
    if (s !== undefined && l === undefined) errs.push(`lost tag ${tag}`);
    if (l !== undefined && !l.startsWith(tag)) errs.push(`tag translated ${tag}`);
  }
  // Тег обязан остаться нетронутым словом (Title:, не Заголовок:)
  for (const line of loc.split('\n')) {
    if (/^(Заголовок|Автор)\s*:/.test(line)) errs.push(`tag translated: ${line}`);
  }
  const sm = JSON.stringify(markupsOf(src));
  if (JSON.stringify(markupsOf(loc)) !== sm) errs.push('markup set differs ([/center] etc must survive)');
  return errs;
}
