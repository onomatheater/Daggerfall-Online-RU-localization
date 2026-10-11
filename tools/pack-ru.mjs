// Сборка ru-пака: версионированная директория + манифест.
// Зипование — шаг релиза (CI: zip -r ru-pack.zip <dir>), здесь только
// детерминированная раскладка: таблицы, шрифт, манифест с file list.
import { copyFileSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { HANDJET_FILES } from '../src/font/handjet.js';
import { cmpVersion } from '../src/locale/loader.js';

const args = process.argv.slice(2);
const get = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);

export function pack({ out, version, game, gameMin, gameMax, root = new URL('..', import.meta.url) }) {
  if (gameMin !== undefined && gameMax !== undefined && cmpVersion(gameMin, gameMax) > 0) {
    throw new Error(`pack: inverted range ${gameMin} > ${gameMax}`);
  }
  if (game !== undefined && gameMin !== undefined && gameMax !== undefined &&
      (cmpVersion(game, gameMin) < 0 || cmpVersion(game, gameMax) > 0)) {
    throw new Error(`pack: game ${game} outside range ${gameMin}..${gameMax}`);
  }
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
  if (game !== undefined) manifest.game = game;
  if (gameMin !== undefined) manifest.gameMin = gameMin;
  if (gameMax !== undefined) manifest.gameMax = gameMax;
  writeFileSync(join(out, 'locale-version.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (process.argv[1]?.endsWith('pack-ru.mjs')) {
  const m = pack({ out: get('--out'), version: get('--version'), game: get('--game'), gameMin: get('--game-min'), gameMax: get('--game-max') });
  console.log(`packed ${m.files.length} files, version ${m.version}`);
}
