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
  'vanilla-build',
  'verify-probe',
  'tables-copy',
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
  const hit = spawnSync(cmd, args, { cwd, encoding: 'utf8', shell: process.platform === 'win32' });
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
  for (const key of ['workRoot', 'gameTag', 'version', 'fromTag', 'scriptsDir', 'queuePath', 'packVersion', 'urlBase', 'vanillaClone', 'probeTree']) {
    need(venue, key);
  }
  if (!Array.isArray(venue.markers) || venue.markers.length === 0) throw new Error('pipeline: need venue.markers[]');
  if (dryRun) return { executed: false, steps: [...STEPS] };
  const run = (cmd, args, cwd) => sh({ cmd, args, cwd });
  const repoLocale = join(REPO_TOOLS, '..', 'src', 'locale');
  const ctx = {
    ...venue,
    vanillaDir: join(venue.workRoot, 'vanilla'),
    stageDir: join(venue.workRoot, 'stage'),
  };
  await buildVanilla({ cloneDir: venue.vanillaClone, outDir: ctx.vanillaDir });
  const probeStatus = run('git', ['-C', venue.probeTree, 'status', '--porcelain']);
  if (probeStatus.output.trim() !== '') throw new Error('pipeline: probe tree dirty, refusing');
  const probeHead = run('git', ['-C', venue.probeTree, 'describe', '--tags', '--exact-match']);
  if (probeHead.output.trim() !== venue.gameTag) {
    throw new Error(`pipeline: probe tree at ${probeHead.output.trim()}, need ${venue.gameTag}`);
  }
  const { cpSync } = await import('node:fs');
  cpSync(repoLocale, join(venue.probeTree, 'src', 'locale'), { recursive: true });
  run('node', [`${REPO_TOOLS}/probe-rebase.mjs`, '--scripts', venue.scriptsDir, '--clone', venue.probeTree, '--queue', venue.queuePath, '--from', venue.fromTag, '--to', venue.gameTag, '--apply']);
  run('npm', ['run', 'build'], venue.probeTree);
  const patchedDist = join(venue.probeTree, 'dist');
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

if (process.argv[1]?.endsWith('publish-pack.mjs')) {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.length === 0) {
    console.log([
      'usage: node tools/publish-pack.mjs [--run] --tag <app-vX> --from <app-vY> --version <0.1.X>',
      '  --pack-version <1.2.3> --scripts <dir> --queue <json> --markers <a,b> --notes <t> --url-base <url>',
      '  --work-root <dir> --vanilla-clone <dir> --probe-tree <dir>',
      '  default: dry-run (steps only, touches nothing). --run executes: vanilla snapshot,',
      '  probe-tree verify, tables copy, queue apply, patched build, markers, stage.',
    ].join('\n'));
    process.exit(0);
  }
  const get = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
  const venue = {
    gameTag: get('--tag'),
    fromTag: get('--from'),
    version: get('--version'),
    packVersion: get('--pack-version'),
    scriptsDir: get('--scripts'),
    queuePath: get('--queue'),
    markers: (get('--markers') ?? '').split(',').filter((s) => s.length > 0),
    notes: (get('--notes') ?? '').split('|').filter((s) => s.length > 0),
    urlBase: get('--url-base'),
    workRoot: get('--work-root'),
    vanillaClone: get('--vanilla-clone'),
    probeTree: get('--probe-tree'),
  };
  const rep = await runPipeline(venue, { dryRun: !args.includes('--run') });
  console.log(JSON.stringify({ executed: rep.executed, steps: rep.steps }));
}
