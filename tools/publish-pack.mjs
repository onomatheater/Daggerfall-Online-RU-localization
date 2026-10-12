// Склейка конвейера: клон тега -> ванильная сборка -> очередь патчей ->
// пропатченная сборка -> маркеры -> stage (пак + рецепт + запись фида).
// Публикации здесь нет (таск 4): runPipeline останавливается на stage.
// Дефолт dry-run: шаги списком, ноль сторонних эффектов.
// Импорт unzip.js из tools — осознанно: glue машинный, не гейт репозитория
// (гейты остаются без зависимостей, см. шапку unzip.js).
// Отклонение от плана: частичный stage без рецепта не делаем — любой
// затык роняет прогон целиком (hold, зовём человека), молчаливого
// полупака не существует.
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { buildVanilla, distReady } from './vanilla-dist.mjs';
import { pack } from './pack-ru.mjs';
import { buildRecipe } from './dist-recipe.mjs';
import { releaseEntry } from './release-ru.mjs';
import { packZip } from '../updater/lib/unzip.js';

const REPO_TOOLS = dirname(fileURLToPath(import.meta.url));

export const STEPS = [
  'clone',
  'deps',
  'vanilla-build',
  'rebase-apply',
  'patched-build',
  'markers',
  'stage',
];

function walkJs(dir, out = []) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of names) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walkJs(full, out);
    else if (name.endsWith('.js') || name.endsWith('.html')) out.push(full);
  }
  return out;
}

export function bundleHasMarkers(distDir, markers) {
  const haystack = walkJs(distDir)
    .map((f) => {
      try {
        return readFileSync(f, 'utf8');
      } catch {
        return '';
      }
    })
    .join('\n');
  return (markers ?? []).every((m) => haystack.includes(m));
}

const defaultSh = ({ cmd, args, cwd }) => {
  const hit = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
  if (hit.status !== 0) {
    throw new Error(`pipeline: ${cmd} ${args.join(' ')} failed: ${String(hit.stderr ?? hit.error ?? '').slice(0, 300)}`);
  }
  return { ok: true, output: String(hit.stdout ?? '') };
};

const need = (venue, key) => {
  if (typeof venue[key] !== 'string' || venue[key].length === 0) {
    throw new Error(`pipeline: need venue.${key}`);
  }
};

const shaFile = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

export async function runPipeline(venue = {}, { dryRun = true, sh = defaultSh } = {}) {
  for (const key of ['workRoot', 'gameTag', 'version', 'fromTag', 'scriptsDir', 'queuePath', 'packVersion', 'urlBase']) {
    need(venue, key);
  }
  if (!Array.isArray(venue.markers) || venue.markers.length === 0) throw new Error('pipeline: need venue.markers[]');
  if (dryRun) return { executed: false, steps: [...STEPS] };
  const run = (cmd, args, cwd) => sh({ cmd, args, cwd });
  const ctx = {
    ...venue,
    cloneDir: join(venue.workRoot, 'dfjs'),
    vanillaDir: join(venue.workRoot, 'vanilla'),
    stageDir: join(venue.workRoot, 'stage'),
  };
  run('git', ['clone', '--branch', venue.gameTag, '--depth', '1', 'https://github.com/Lattymoy/daggerfall-js-source.git', ctx.cloneDir]);
  run('npm', ['install'], ctx.cloneDir);
  await buildVanilla({ cloneDir: ctx.cloneDir, outDir: ctx.vanillaDir });
  run('node', [`${REPO_TOOLS}/probe-rebase.mjs`, '--scripts', venue.scriptsDir, '--clone', ctx.cloneDir, '--queue', venue.queuePath, '--from', venue.fromTag, '--to', venue.gameTag, '--apply']);
  run('npm', ['run', 'build'], ctx.cloneDir);
  const patchedDist = join(ctx.cloneDir, 'dist');
  if (!distReady(patchedDist)) throw new Error('pipeline: patched build has no dist');
  if (!bundleHasMarkers(patchedDist, venue.markers ?? [])) {
    throw new Error('pipeline: markers missing in patched bundle');
  }
  mkdirSync(ctx.stageDir, { recursive: true });
  const packDir = join(ctx.stageDir, 'pack');
  const fromVersion = venue.fromTag.replace(/^app-v/, '');
  pack({ out: packDir, version: venue.packVersion, gameMin: fromVersion, gameMax: venue.version });
  const packZipPath = join(ctx.stageDir, 'dfo-ru-pack.zip');
  packZip(packDir, packZipPath);
  const recipe = buildRecipe({ vanillaDir: ctx.vanillaDir, patchedDir: patchedDist, game: venue.version });
  const recipePkg = join(ctx.stageDir, 'recipe-pkg');
  mkdirSync(recipePkg, { recursive: true });
  writeFileSync(join(recipePkg, 'recipe.json'), JSON.stringify(recipe));
  const recipeZipPath = join(ctx.stageDir, `recipe-${venue.version}.zip`);
  packZip(recipePkg, recipeZipPath);
  const entry = releaseEntry({
    zipPath: packZipPath,
    packDir,
    url: `${venue.urlBase}/dfo-ru-pack.zip`,
    notes: venue.notes ?? [],
    recipe: { url: `${venue.urlBase}/recipe-${venue.version}.zip`, sha: shaFile(recipeZipPath) },
  });
  return { executed: true, steps: [...STEPS], ctx, staged: { entry, packZipPath, recipeZipPath } };
}
