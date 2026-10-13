// Единая подстановка плейсхолдеров: %s строго по порядку значений
// (каждый replace берёт ПЕРВОЕ вхождение — replaceAll в цикле затирал
// всё последним значением: '%s + %s' давало 'a + a'), {k} по именам.
// Единственный источник — locale.js/loader.js/adapter используют только её.
export function applyParams(s, params = {}) {
  let out = String(s);
  for (const v of Object.values(params)) out = out.replace('%s', String(v));
  for (const [k, v] of Object.entries(params)) out = out.replaceAll(`{${k}}`, String(v));
  return out;
}
