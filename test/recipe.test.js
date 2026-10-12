// NEED: перестановка патча после обновления игры — без исходников и сборки
// на машине пользователя (там распакованное resources/app, проба 12.10).
// - buildRecipe({vanillaDir, patchedDir}): сверка двух dist-деревьев ->
//   {game, add: [{path, content(base64), encoding}], delete: [paths]} (только изменившееся).
// - applyRecipe({appDir, recipe}): сверяет delete-цели (нет — отказ, дерево
//   цело), декодит base64 в байты, кладёт add-файлы, проверяет маркеры. Маркера нет — отказ.
// Рецепты живут в релизах (в репозиторий мегабайтные JSON не едут).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildRecipe } from '../tools/dist-recipe.mjs';
import { applyRecipe } from '../updater/lib/dist-apply.js';

const mk = () => mkdtempSync(join(tmpdir(), 'rurecipe-'));
const b64 = (s) => ({ content: Buffer.from(s, 'utf8').toString('base64'), encoding: 'base64' });
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
  const adds = Object.fromEntries(recipe.add.map((f) => [f.path, Buffer.from(f.content, 'base64').toString('utf8')]));
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
      add: [{ path: 'assets/a.js', ...b64('AAA-CHANGED') }],
      delete: ['assets/old.js'],
      markers: ['AAA-CHANGED'],
    },
  });
  assert.deepEqual(ok, { ok: true, applied: 1, removed: 1 });
  assert.equal(readFileSync(join(appDir, 'assets/a.js'), 'utf8'), 'AAA-CHANGED');
  assert.equal(existsSync(join(appDir, 'assets/old.js')), false);
  assert.equal(verifyApplied({
    appDir,
    recipe: { game: '7815', add: [{ path: 'assets/a.js', ...b64('AAA-CHANGED') }], delete: [] },
  }).ok, true);

  const before = readFileSync(join(appDir, 'assets/a.js'), 'utf8');
  const missing = await applyRecipe({
    appDir,
    recipe: { game: '7815', add: [], delete: ['assets/nope.js'], markers: [] },
  });
  assert.equal(missing.ok, false);
  const badMarker = await applyRecipe({
    appDir,
    recipe: { game: '7815', add: [{ path: 'assets/a.js', ...b64('ZZZ') }], delete: [], markers: ['NOPE-NEVER-HERE'] },
  });
  assert.equal(badMarker.ok, false);
  assert.equal(readFileSync(join(appDir, 'assets/a.js'), 'utf8'), before, 'refused applies leave tree intact');
});

test('verifyApplied compares full content, not a prefix', async () => {
  const { verifyApplied } = await import('../updater/lib/dist-apply.js');
  const dir = mk();
  const app = join(dir, 'app');
  const full = 'AAA-CHANGED:' + 'x'.repeat(200);
  dist(app, { 'assets/a.js': full });
  const appDir = join(app, 'dist');
  const recipe = { game: '7815', add: [{ path: 'assets/a.js', ...b64(full) }], delete: [] };
  assert.equal(verifyApplied({ appDir, recipe }).ok, true);

  writeFileSync(join(appDir, 'assets/a.js'), full.slice(0, 64), 'utf8');
  const cut = verifyApplied({ appDir, recipe });
  assert.equal(cut.ok, false, 'truncated tail must fail verification');
  assert.ok(typeof cut.reason === 'string' && cut.reason.length > 0, 'reason present');
});

test('recipe roundtrips binary bytes exactly through JSON', async () => {
  const { buildRecipe } = await import('../tools/dist-recipe.mjs');
  const { applyRecipe, verifyApplied } = await import('../updater/lib/dist-apply.js');
  const { readFileSync: readBytes } = await import('node:fs');
  const vanilla = mk();
  const patched = mk();
  dist(vanilla, { 'assets/a.js': 'AAA' });
  dist(patched, { 'assets/a.js': 'AAA-CHANGED' });
  const bin = Buffer.concat([Buffer.from('wOF2', 'utf8'), Buffer.from([0, 255, 254, 13, 10, 0, 128, 200])]);
  writeFileSync(join(patched, 'dist', 'assets', 'font.woff2'), bin);
  const recipe = buildRecipe({ vanillaDir: join(vanilla, 'dist'), patchedDir: join(patched, 'dist'), game: '7815' });
  const wire = JSON.parse(JSON.stringify(recipe));
  const font = wire.add.find((f) => f.path === 'assets/font.woff2');
  assert.equal(font.encoding, 'base64');

  const target = mk();
  dist(target, { 'assets/a.js': 'AAA' });
  const appDir = join(target, 'dist');
  const rep = await applyRecipe({ appDir, recipe: wire });
  assert.equal(rep.ok, true);
  assert.ok(readBytes(join(appDir, 'assets', 'font.woff2')).equals(bin), 'binary byte-identical');
  assert.equal(verifyApplied({ appDir, recipe: wire }).ok, true);
});

test('recipe without base64 encoding refuses loudly', async () => {
  const { applyRecipe } = await import('../updater/lib/dist-apply.js');
  const dir = mk();
  const app = join(dir, 'app');
  dist(app, { 'assets/a.js': 'AAA' });
  const rep = await applyRecipe({
    appDir: join(app, 'dist'),
    recipe: { game: '7815', add: [{ path: 'assets/a.js', content: 'AAA' }], delete: [], markers: [] },
  });
  assert.equal(rep.ok, false, 'legacy utf8 shape is not applied silently');
  assert.equal(readBytesSafe(join(app, 'dist', 'assets', 'a.js')), 'AAA');
});

function readBytesSafe(path) {
  return readFileSync(path, 'utf8');
}
