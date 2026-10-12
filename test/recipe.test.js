// NEED: перестановка патча после обновления игры — без исходников и сборки
// на машине пользователя (там распакованное resources/app, проба 12.10).
// - buildRecipe({vanillaDir, patchedDir}): сверка двух dist-деревьев ->
//   {game, add: [{path, content}], delete: [paths]} (только изменившееся).
// - applyRecipe({appDir, recipe}): сверяет delete-цели (нет — отказ, дерево
//   цело), кладёт add-файлы, проверяет маркеры. Маркера нет — отказ.
// Рецепты живут в релизах (в репозиторий мегабайтные JSON не едут).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildRecipe } from '../tools/dist-recipe.mjs';
import { applyRecipe } from '../updater/lib/dist-apply.js';

const mk = () => mkdtempSync(join(tmpdir(), 'rurecipe-'));
function dist(root, files) {
  mkdirSync(join(root, 'dist', 'assets'), { recursive: true });
  for (const [rel, content] of Object.entries(files)) writeFileSync(join(root, 'dist', rel), content);
}

test('buildRecipe emits only changed files as add, vanished as delete', () => {
  const vanilla = mk();
  const patched = mk();
  dist(vanilla, { 'index.html': '<a/>', 'assets/a.js': 'AAA', 'assets/b.js': 'BBB' });
  dist(patched, { 'index.html': '<a/>', 'assets/a.js': 'AAA-CHANGED', 'assets/c.js': 'CCC' });
  const recipe = buildRecipe({ vanillaDir: join(vanilla, 'dist'), patchedDir: join(patched, 'dist'), game: '7815' });
  assert.equal(recipe.game, '7815');
  const adds = Object.fromEntries(recipe.add.map((f) => [f.path, f.content]));
  assert.equal(adds['assets/a.js'], 'AAA-CHANGED');
  assert.equal(adds['assets/c.js'], 'CCC');
  assert.ok(!recipe.add.some((f) => f.path === 'assets/b.js'), 'unchanged not shipped');
  assert.ok(!recipe.add.some((f) => f.path === 'index.html'), 'identical not shipped');
  assert.deepEqual(recipe.delete, ['assets/b.js']);
});

test('applyRecipe swaps files in unpacked tree, refuses cleanly', async () => {
  const { applyRecipe, verifyApplied } = await import('../updater/lib/dist-apply.js');
  const dir = mk();
  const app = join(dir, 'app');
  dist(app, { 'index.html': '<a/>', 'assets/a.js': 'AAA', 'assets/old.js': 'OLD' });
  const appDir = join(app, 'dist');

  const ok = await applyRecipe({
    appDir,
    recipe: {
      game: '7815',
      add: [{ path: 'assets/a.js', content: 'AAA-CHANGED' }],
      delete: ['assets/old.js'],
      markers: ['AAA-CHANGED'],
    },
  });
  assert.deepEqual(ok, { ok: true, applied: 1, removed: 1 });
  assert.equal(readFileSync(join(appDir, 'assets/a.js'), 'utf8'), 'AAA-CHANGED');
  assert.equal(existsSync(join(appDir, 'assets/old.js')), false);
  assert.equal(verifyApplied({
    appDir,
    recipe: { game: '7815', add: [{ path: 'assets/a.js', content: 'AAA-CHANGED' }], delete: [] },
  }).ok, true);

  const before = readFileSync(join(appDir, 'assets/a.js'), 'utf8');
  const missing = await applyRecipe({
    appDir,
    recipe: { game: '7815', add: [], delete: ['assets/nope.js'], markers: [] },
  });
  assert.equal(missing.ok, false);
  const badMarker = await applyRecipe({
    appDir,
    recipe: { game: '7815', add: [{ path: 'assets/a.js', content: 'ZZZ' }], delete: [], markers: ['NOPE-NEVER-HERE'] },
  });
  assert.equal(badMarker.ok, false);
  assert.equal(readFileSync(join(appDir, 'assets/a.js'), 'utf8'), before, 'refused applies leave tree intact');
});
