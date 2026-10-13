// Единая подстановка плейсхолдеров: %s по порядку значений, {k} по именам.
// Единственный источник — locale.js/loader.js/adapter используют только её.
export function applyParams(s, params = {}) {
  let out = String(s);
  for (const v of Object.values(params)) out = out.replaceAll('%s', String(v));
  for (const [k, v] of Object.entries(params)) out = out.replaceAll(`{${k}}`, String(v));
  return out;
}
