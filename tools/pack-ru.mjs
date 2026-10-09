// Сборка ru-пака: версионированная директория + манифест.
// Зипование — шаг релиза (CI: zip -r ru-pack.zip <dir>), здесь только
// детерминированная раскладка: таблицы, шрифт, манифест с file list.
import { copyFileSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { HANDJET_FILES } from '../src/font/handjet.js';

const args = process.argv.slice(2);
const get = (f) => args[args.indexOf(f) + 1];

export function pack({ out, version, root = new URL('..', import.meta.url) }) {
  const files = [];
  const put = (srcRel, destRel) => {
    mkdirSync(join(out, destRel.split('/').slice(0, -1).join('/') || '.'), { recursive: true });
    copyFileSync(new URL(srcRel, root), join(out, destRel));
    files.push(destRel);
  };
  put('src/locale/ru.json', 'ru.json');
  for (const f of HANDJET_FILES) put(`vendor/handjet/${f}`, `fonts/${f}`);
  for (const dir of ['quests', 'books']) {
    const srcDir = new URL(`src/locale/ru/${dir}/`, root);
    for (const f of readdirSync(srcDir).filter((f) => f.endsWith('-LOC.txt'))) {
      put(`src/locale/ru/${dir}/${f}`, `${dir}/${f}`);
    }
  }
  const manifest = { locale: 'ru', version, files };
  writeFileSync(join(out, 'locale-version.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (process.argv[1]?.endsWith('pack-ru.mjs')) {
  const m = pack({ out: get('--out'), version: get('--version') });
  console.log(`packed ${m.files.length} files, version ${m.version}`);
}
