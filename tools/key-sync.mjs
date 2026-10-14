// Синк ключей: сверка upstream-EN с нашими таблицами (без пересборки dist).
// Выход — ОЧЕРЕДЬ: newKeys (перевести человеку, EN точный), changedEn (RU на
// ревью), gone (только deprecate — удаление ключей запрещено). Перевод
// автомата запрещён: RU пишет человек/переводчик (см. CONTRIBUTING.md).
// Рендер до синка держит существующий fallback ru→en→key+warn (t/wrap).
import { readFileSync } from 'node:fs';

const tablesOf = (doc) => (doc && typeof doc === 'object' ? doc : {});

const canon = (v) => {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`;
  }
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  return JSON.stringify(v);
};

export function keySync(upstreamEn, repoEn) {
  const up = tablesOf(upstreamEn);
  const en = tablesOf(repoEn);
  const newKeys = [];
  const changedEn = [];
  const gone = [];
  let upstream = 0;
  let repo = 0;
  for (const table of new Set([...Object.keys(up), ...Object.keys(en)])) {
    const uRows = up[table] && typeof up[table] === 'object' ? up[table] : {};
    const eRows = en[table] && typeof en[table] === 'object' ? en[table] : {};
    for (const [key, value] of Object.entries(uRows)) {
      upstream++;
      if (!(key in eRows)) newKeys.push({ table, key, en: value });
      else if (canon(eRows[key]) !== canon(value)) changedEn.push({ table, key, oldEn: eRows[key], newEn: value });
    }
    for (const key of Object.keys(eRows)) {
      repo++;
      const uTable = up[table] && typeof up[table] === 'object' ? up[table] : {};
      if (!(key in uTable)) gone.push({ table, key, deprecate: true });
    }
  }
  return { newKeys, changedEn, gone, stats: { upstream, repo } };
}

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

if (process.argv[1]?.endsWith('key-sync.mjs')) {
  const arg = (name) => {
    const i = process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : undefined;
  };
  const rep = keySync(
    readJson(arg('--upstream') ?? ''),
    readJson(arg('--en') ?? ''),
  );
  for (const n of rep.newKeys) console.log(`new ${n.table}:${n.key} = ${JSON.stringify(n.en)}`);
  for (const c of rep.changedEn) console.log(`changed ${c.table}:${c.key}: ${JSON.stringify(c.oldEn)} -> ${JSON.stringify(c.newEn)}`);
  for (const g of rep.gone) console.log(`gone (deprecate, never delete) ${g.table}:${g.key}`);
  console.log(`queues: new=${rep.newKeys.length} changed=${rep.changedEn.length} gone=${rep.gone.length}`);
  process.exit(rep.newKeys.length + rep.changedEn.length > 0 ? 1 : 0);
}
