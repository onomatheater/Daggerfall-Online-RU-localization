// NEED: разовая миграция asar -> распакованная папка + откат ванили.
// - ensureUnpacked({resourcesDir, backupPath}): есть app.asar -> копия
//   в backupPath, extract в resources/app, asar удалить; уже распаковано
//   (папка есть, asar нет) -> {migrated:false}, ничего не трогаем.
// - applyRecipe({appDir, recipe, backupDir}): перед записью складывает
//   ванильные копии заменяемых/удаляемых файлов в backupDir.
// - rollbackVanilla({appDir, backupDir}): возвращает ванильные копии,
//   отчёт {ok, restored}. Пустой бэкап -> {ok:false}, дерево цело.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureUnpacked } from '../updater/lib/migrate.js';
import { applyRecipe, rollbackVanilla } from '../updater/lib/dist-apply.js';

const mk = () => mkdtempSync(join(tmpdir(), 'rumig-'));

test('ensureUnpacked migrates once, second run is a no-op', async () => {
  const asar = await import('../updater/node_modules/@electron/asar/lib/asar.js');
  const dir = mk();
  const src = join(dir, 'src');
  mkdirSync(join(src, 'dist'), { recursive: true });
  writeFileSync(join(src, 'package.json'), '{"v":1}');
  writeFileSync(join(src, 'dist', 'a.js'), 'AAA');
  const resDir = join(dir, 'resources');
  mkdirSync(resDir, { recursive: true });
  await asar.createPackage(src, join(resDir, 'app.asar'));

  const first = await ensureUnpacked({ resourcesDir: resDir, backupPath: join(dir, 'bak.asar') });
  assert.equal(first.migrated, true);
  assert.equal(readFileSync(join(resDir, 'app', 'dist', 'a.js'), 'utf8'), 'AAA');
  assert.equal(existsSync(join(resDir, 'app.asar')), false);
  assert.equal(existsSync(join(dir, 'bak.asar')), true);
  const second = await ensureUnpacked({ resourcesDir: resDir, backupPath: join(dir, 'bak2.asar') });
  assert.equal(second.migrated, false);
});

test('applyRecipe backups vanilla, rollbackVanilla restores it', async () => {
  const { applyRecipe: apply, rollbackVanilla: rollback } = await import('../updater/lib/dist-apply.js');
  const dir = mk();
  const app = join(dir, 'app', 'dist');
  mkdirSync(app, { recursive: true });
  writeFileSync(join(app, 'a.js'), 'AAA');
  writeFileSync(join(app, 'old.js'), 'OLD');
  const bak = join(dir, 'bak');

  const ok = await apply({
    appDir: join(dir, 'app', 'dist'),
    recipe: { game: 'x', add: [{ path: 'a.js', content: Buffer.from('AAA-CHANGED', 'utf8').toString('base64'), encoding: 'base64' }], delete: ['old.js'], markers: ['AAA-CHANGED'] },
    backupDir: bak,
  });
  assert.equal(ok.ok, true);
  assert.equal(readFileSync(join(app, 'a.js'), 'utf8'), 'AAA-CHANGED');
  const back = await rollback({ appDir: join(dir, 'app', 'dist'), backupDir: bak });
  assert.deepEqual(back, { ok: true, restored: 2 });
  assert.equal(readFileSync(join(app, 'a.js'), 'utf8'), 'AAA');
  assert.equal(readFileSync(join(app, 'old.js'), 'utf8'), 'OLD');
  const empty = await rollback({ appDir: join(dir, 'app', 'dist'), backupDir: join(dir, 'nope') });
  assert.equal(empty.ok, false);
});

test('ensureUnpacked on corrupt asar keeps asar, cleans own artifacts', async () => {
  const asar = await import('../updater/node_modules/@electron/asar/lib/asar.js');
  const { truncateSync, statSync } = await import('node:fs');
  const dir = mk();
  const src = join(dir, 'src');
  mkdirSync(join(src, 'dist'), { recursive: true });
  writeFileSync(join(src, 'package.json'), '{"v":1}');
  writeFileSync(join(src, 'dist', 'a.js'), 'AAA');
  const resDir = join(dir, 'resources');
  mkdirSync(resDir, { recursive: true });
  const ap = join(resDir, 'app.asar');
  await asar.createPackage(src, ap);
  truncateSync(ap, 100);
  assert.ok(statSync(ap).size === 100);

  await assert.rejects(
    ensureUnpacked({ resourcesDir: resDir, backupPath: join(dir, 'bak.asar') }),
    /migrat|corrupt|extract|package\.json/i,
    'corrupt asar refuses with a reason',
  );
  assert.equal(existsSync(ap), true, 'corrupt asar is never deleted');
  assert.equal(existsSync(join(resDir, 'app')), false, 'no half-tree left behind');
  assert.equal(existsSync(join(dir, 'bak.asar')), false, 'no backup of corrupt bytes');
});

test('ensureUnpacked refuses asar without package.json sentinel', async () => {
  const asar = await import('../updater/node_modules/@electron/asar/lib/asar.js');
  const dir = mk();
  const src = join(dir, 'src');
  mkdirSync(join(src, 'dist'), { recursive: true });
  writeFileSync(join(src, 'dist', 'a.js'), 'AAA');
  const resDir = join(dir, 'resources');
  mkdirSync(resDir, { recursive: true });
  await asar.createPackage(src, join(resDir, 'app.asar'));

  await assert.rejects(ensureUnpacked({ resourcesDir: resDir, backupPath: join(dir, 'bak.asar') }), /package\.json/);
  assert.equal(existsSync(join(resDir, 'app.asar')), true, 'unverified tree never replaces asar');
});

test('ensureUnpacked never clobbers an existing backup', async () => {
  const asar = await import('../updater/node_modules/@electron/asar/lib/asar.js');
  const dir = mk();
  const src = join(dir, 'src');
  mkdirSync(join(src, 'dist'), { recursive: true });
  writeFileSync(join(src, 'package.json'), '{"v":1}');
  const resDir = join(dir, 'resources');
  mkdirSync(resDir, { recursive: true });
  await asar.createPackage(src, join(resDir, 'app.asar'));
  const bak = join(dir, 'bak.asar');
  writeFileSync(bak, 'OLDER-GOOD-BACKUP');

  const rep = await ensureUnpacked({ resourcesDir: resDir, backupPath: bak });
  assert.equal(rep.migrated, true);
  assert.equal(readFileSync(bak, 'utf8'), 'OLDER-GOOD-BACKUP', 'existing backup wins');
});
