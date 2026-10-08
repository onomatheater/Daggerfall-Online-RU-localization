// Валидатор -LOC переводов (квесты/книги) по паре источник→перевод.
// Правила из DFU-вики и AGENTS.md: QRC: переводится, QBN: не шиппится
// (логика всегда из исходника); макросы %xxx, Message:-id, разбивка <-->
// и книжная разметка [/...] обязаны пережить перевод один в один.
// Работает на синтетике здесь; на реальные файлы Jagget пойдёт той же
// функцией, когда будет разрешение.
const MACRO = /%[a-zA-Z0-9]+/g;
const MARKUP = /\[\/[a-zA-Z]+[^\]]*\]/g;

const macrosOf = (s) => new Set([...String(s).matchAll(MACRO)].map((m) => m[0]));
const markupsOf = (s) => [...String(s).matchAll(MARKUP)].map((m) => m[0]).sort();

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
