// NEED: перестановка патча после обновления игры — без исходников и сборки
// на машине пользователя (там только installed app.asar).
// - buildRecipe({vanillaDir, patchedDir}): сверка двух dist-деревьев ->
//   {game, add: [{path, content}], delete: [paths]} (только изменившееся;
//   неизменные чанки совпадают байтом и не едут).
// - applyRecipe({asarPath, recipe, readAsar, writeAsar}): сверяет наличие
//   delete-целей в asar (нет — отказ, asar не тронут), кладёт add-файлы,
//   проверяет маркеры, пересобирает asar. Маркера нет — отказ.
// Рецепты живут в релизах (в репозиторий 10-мегабайтные JSON не едут),
// asar-бэкап перед хирургией — обязанность вызывателя (main).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
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

test('applyRecipe swaps files in asar, refuses on missing target or marker', async () => {
  const asar = await import('../updater/node_modules/@electron/asar/lib/asar.js');
  const dir = mk();
  const src = join(dir, 'app');
  mkdirSync(join(src, 'dist', 'assets'), { recursive: true });
  writeFileSync(join(src, 'dist', 'index.html'), '<a/>');
  writeFileSync(join(src, 'dist', 'assets', 'a.js'), 'AAA');
  const asarPath = join(dir, 'app.asar');
  await asar.createPackage(src, asarPath);

  const recipe = {
    game: '7815',
    add: [{ path: 'dist/assets/a.js', content: 'AAA-CHANGED' }],
    delete: [],
    markers: ['AAA-CHANGED'],
  };
  const ok = await applyRecipe({ asarPath, recipe });
  assert.equal(ok.ok, true);
  // Поиск в asar — посегментный через path.sep без ведущего сепаратора.
  const lookup = ['dist', 'assets', 'a.js'].join(process.platform === 'win32' ? '\\' : '/');
  const after = String(asar.extractFile(asarPath, lookup));
  assert.ok(after.includes('AAA-CHANGED'), 'patched content in asar');
  const before = readFileSync(asarPath);

  const missing = await applyRecipe({
    asarPath,
    recipe: { game: '7815', add: [], delete: ['dist/assets/nope.js'], markers: [] },
  });
  assert.equal(missing.ok, false);
  const badMarker = await applyRecipe({
    asarPath,
    recipe: { game: '7815', add: [], delete: [], markers: ['NOPE-NEVER-HERE'] },
  });
  assert.equal(badMarker.ok, false);
  assert.deepEqual(readFileSync(asarPath), before, 'refused applies leave asar byte-identical');
});
