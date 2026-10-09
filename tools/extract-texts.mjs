// tools/extract-texts.mjs — извлечь транслируемые строки экрана → [{ key, en, line }].
// Чистый ESM, без зависимостей. Разметка/сеть/ID не извлекаются, только дисплейный текст.
export function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .slice(0, 48);
}

function isSkippable(raw) {
  const s = raw.trim();
  if (!s) return true;
  if (s.startsWith('dfo:')) return true; // уже ключ
  if (/^QBN:/i.test(s)) return true; // логика квестов — не трогаем
  if (/^(https?:|\.\.?\/\/|\.\.?\/|[/\\])/.test(s)) return true; // url/путь
  if (/[/\\].*\./.test(s)) return true; // путь с расширением (./assets/map.png)
  if (!/[A-Za-zА-Яа-яЁё]/.test(s)) return true; // без букв — не текст
  if (/^[a-z_$][\w$]*$/.test(s)) return true; // чистый код-идентификатор (on, className)
  return false;
}

export function extractTexts(source, page = 'page') {
  const found = new Map(); // en -> { key, en, line }
  const usedSlugs = new Set();
  const push = (raw, index) => {
    const en = String(raw).trim();
    if (isSkippable(en) || found.has(en)) return;
    let slug = slugify(en) || 'text';
    let uniq = slug;
    let n = 2;
    while (usedSlugs.has(uniq)) uniq = `${slug}_${n++}`;
    usedSlugs.add(uniq);
    const line = source.slice(0, index).split('\n').length;
    found.set(en, { key: `dfo:${page}.${uniq}`, en, line });
  };
  const tagRe = />((?:[^<>{}])+?)</g;
  let m;
  while ((m = tagRe.exec(source))) push(m[1], m.index + 1);
  const quoteRe = /['"]([^'"`\n\r]{1,200})['"]/g;
  while ((m = quoteRe.exec(source))) push(m[1], m.index + 1);
  return [...found.values()];
}
