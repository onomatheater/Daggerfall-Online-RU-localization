// Рецепт перестановки патча: сверка двух dist-деревьев (ваниль vs наш билд).
// Выход: {game, add: [{path, content}], delete: [paths]} — только разница.
// Неизменные чанки совпадают байтом и в рецепт не едут (поэтому 2 МБ, а не 173).
// Чистый fs, ноль зависимостей. Рецепты живут в релизах, не в репозитории.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

function walk(dir, base = dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, base, out);
    else out.push(relative(base, full).split(sep).join('/'));
  }
  return out;
}

export function buildRecipe({ vanillaDir, patchedDir, game } = {}) {
  if (typeof game !== 'string' || game.length === 0) throw new Error('buildRecipe: need game');
  const vanilla = new Map();
  for (const rel of walk(vanillaDir)) vanilla.set(rel, readFileSync(join(vanillaDir, rel)));
  const patched = new Map();
  for (const rel of walk(patchedDir)) patched.set(rel, readFileSync(join(patchedDir, rel)));
  const add = [];
  for (const [rel, bytes] of patched) {
    const old = vanilla.get(rel);
    if (!old || !old.equals(bytes)) add.push({ path: rel, content: bytes.toString('utf8') });
  }
  const gone = [...vanilla.keys()].filter((rel) => !patched.has(rel));
  // Удаляем только переименованные чанки сборки (*.js внутри assets):
  // ванильный main-x.js мёртв, раз patched даёт main-y.js. Остальное не трогаем.
  const deleted = gone.filter((rel) => rel.endsWith('.js'));
  return { game, add, delete: deleted };
}

if (process.argv[1]?.endsWith('dist-recipe.mjs')) {
  const args = process.argv.slice(2);
  const get = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
  const { writeFileSync, mkdirSync, dirname } = await import('node:fs');
  const recipe = buildRecipe({ vanillaDir: get('--vanilla'), patchedDir: get('--patched'), game: get('--game') });
  const out = get('--out');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(recipe, null, 2));
  console.log(`recipe: ${recipe.add.length} add, ${recipe.delete.length} delete, game ${recipe.game}`);
}
