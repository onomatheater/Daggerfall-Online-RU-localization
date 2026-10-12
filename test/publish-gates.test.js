// NEED: публикация только проверенного и только в packs/.
// - gatesOk(report): build + маркеры + пак + проба — всё true, иначе стоп.
// - publishPack({repoDir, files, message, dryRun, sh}): пишет только пути
//   под packs/, грязное дерево вне packs/ — отказ, dry-run — только план.
//   Push — лишь в явном прогоне. Чужие пути не пишутся никогда.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { gatesOk, publishPack } from '../tools/publish-gates.mjs';

const mk = () => mkdtempSync(join(tmpdir(), 'rupub-'));
const git = (args, cwd) => {
  const hit = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (hit.status !== 0) throw new Error(`git ${args.join(' ')}: ${hit.stderr}`);
  return String(hit.stdout ?? '').trim();
};
function fixtureRepo() {
  const origin = mk();
  git(['init', '--bare', '-b', 'main'], origin);
  const work = mk();
  git(['clone', origin, work], mk());
  git(['config', 'user.email', 't@t'], work);
  git(['config', 'user.name', 't'], work);
  git(['checkout', '-b', 'main'], work);
  mkdirSync(join(work, 'packs'), { recursive: true });
  writeFileSync(join(work, 'packs', 'feed.json'), '{"packs":[]}');
  writeFileSync(join(work, 'src.txt'), 'v1');
  git(['add', '.'], work);
  git(['commit', '-m', 'init'], work);
  git(['push', '-u', 'origin', 'main'], work);
  return { origin, work };
}

test('gatesOk needs every gate green', () => {
  assert.equal(gatesOk({ build: true, markers: true, pack: true, probe: true }), true);
  assert.equal(gatesOk({ build: true, markers: false, pack: true, probe: true }), false);
  assert.equal(gatesOk({}), false);
});

test('publishPack dry-run writes nothing', async () => {
  const { work } = fixtureRepo();
  const rep = await publishPack({
    repoDir: work,
    files: [{ path: 'packs/feed.json', content: '{"packs":[]}' }],
    message: 'chore(packs): test',
    dryRun: true,
    sh: () => { throw new Error('must not shell in dry-run'); },
  });
  assert.equal(rep.published, false);
  assert.deepEqual(rep.paths, ['packs/feed.json']);
});

test('publishPack refuses non-packs paths and dirty trees', async () => {
  const { work } = fixtureRepo();
  const evil = await publishPack({
    repoDir: work,
    files: [{ path: 'src/evil.js', content: 'x' }],
    message: 'x',
    dryRun: false,
  });
  assert.equal(evil.ok, false);
  assert.equal(existsSync(join(work, 'src', 'evil.js')), false);
  writeFileSync(join(work, 'src.txt'), 'dirty');
  const dirty = await publishPack({
    repoDir: work,
    files: [{ path: 'packs/feed.json', content: '{}' }],
    message: 'x',
    dryRun: false,
  });
  assert.equal(dirty.ok, false);
  assert.ok(String(dirty.reason).includes('packs/'));
});

test('publishPack commits and pushes packs only', async () => {
  const { work } = fixtureRepo();
  const rep = await publishPack({
    repoDir: work,
    files: [{ path: 'packs/feed.json', content: '{"packs":[],"v":2}' }],
    message: 'chore(packs): test',
    dryRun: false,
  });
  assert.equal(rep.ok, true);
  const log = git(['log', '--oneline', '-1'], work);
  assert.ok(log.includes('chore(packs)'), log);
  assert.equal(readFileSync(join(work, 'packs', 'feed.json'), 'utf8'), '{"packs":[],"v":2}');
});
