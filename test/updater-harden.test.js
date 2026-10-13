// NEED: updater ставит чужой/сетевой контент — пути обязаны сидеть внутри
// целевых директорий. Траверс ../ и абсолютные пути = громкий отказ,
// дерево не тронуто. Zip-slip проверяется ДО распаковки.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

const mk = () => mkdtempSync(join(tmpdir(), 'ruhard-'));
const b64 = (s) => ({ content: Buffer.from(s, 'utf8').toString('base64'), encoding: 'base64' });
function dist(root, files) {
  mkdirSync(join(root, 'dist', 'assets'), { recursive: true });
  for (const [rel, content] of Object.entries(files)) writeFileSync(join(root, 'dist', rel), content);
}

test('applyRecipe refuses ../ traversal in add, tree intact', async () => {
  const { applyRecipe } = await import('../updater/lib/dist-apply.js');
  const dir = mk();
  dist(dir, { 'assets/a.js': 'AAA' });
  const appDir = join(dir, 'dist');
  const rep = await applyRecipe({
    appDir,
    recipe: { game: '1', add: [{ path: '../evil.js', ...b64('X') }], delete: [], markers: [] },
  });
  assert.equal(rep.ok, false);
  assert.match(rep.reason, /unsafe path/);
  assert.equal(readFileSync(join(appDir, 'assets', 'a.js'), 'utf8'), 'AAA');
  assert.equal(existsSync(join(dir, 'evil.js')), false);
});

test('applyRecipe refuses absolute and traversal paths in delete', async () => {
  const { applyRecipe } = await import('../updater/lib/dist-apply.js');
  const dir = mk();
  dist(dir, { 'assets/a.js': 'AAA' });
  const appDir = join(dir, 'dist');
  for (const bad of ['../evil.js', '/abs.js', 'C:/win.js', 'a/../../b.js']) {
    const rep = await applyRecipe({ appDir, recipe: { game: '1', add: [], delete: [bad], markers: [] } });
    assert.equal(rep.ok, false, bad);
    assert.match(rep.reason, /unsafe path/, bad);
  }
  assert.equal(readFileSync(join(appDir, 'assets', 'a.js'), 'utf8'), 'AAA');
});

test('verifyApplied refuses unsafe path', async () => {
  const { verifyApplied } = await import('../updater/lib/dist-apply.js');
  const dir = mk();
  dist(dir, { 'assets/a.js': 'AAA' });
  const rep = verifyApplied({
    appDir: join(dir, 'dist'),
    recipe: { game: '1', add: [{ path: '../evil.js', ...b64('X') }], delete: [] },
  });
  assert.equal(rep.ok, false);
  assert.match(rep.reason, /unsafe path/);
});

test('unpackZip refuses zip-slip entries before extracting', async () => {
  const { unpackZip } = await import('../updater/lib/unzip.js');
  const dir = mk();
  // adm-zip санитизирует имена при записи, поэтому злой zip собираем
  // байтами вручную (stored, без сжатия): запись '../evil.txt'.
  const zipPath = join(dir, 'evil.zip');
  writeFileSync(zipPath, rawZip('../evil.txt', 'X'));
  const dest = join(dir, 'out');
  let rep;
  try {
    rep = unpackZip(zipPath, dest);
  } catch (err) {
    rep = { ok: false, reason: String(err?.message ?? err) };
  }
  assert.equal(rep.ok, false);
  assert.match(String(rep.reason ?? rep), /zip-slip|unsafe/i);
  assert.equal(existsSync(join(dir, 'evil.txt')), false);
});

function crc32(buf) {
  let table = crc32.t;
  if (!table) {
    table = crc32.t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = -1;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function rawZip(name, content) {
  const data = Buffer.from(content, 'utf8');
  const nm = Buffer.from(name, 'utf8');
  const crc = crc32(data);
  const lh = Buffer.alloc(30);
  lh.writeUInt32LE(0x04034b50, 0);
  lh.writeUInt16LE(20, 4);
  lh.writeUInt16LE(0x0800, 6);
  lh.writeUInt16LE(0, 8);
  lh.writeUInt16LE(0, 10);
  lh.writeUInt16LE(0, 12);
  lh.writeUInt32LE(crc, 14);
  lh.writeUInt32LE(data.length, 18);
  lh.writeUInt32LE(data.length, 22);
  lh.writeUInt16LE(nm.length, 26);
  lh.writeUInt16LE(0, 28);
  const cd = Buffer.alloc(46);
  cd.writeUInt32LE(0x02014b50, 0);
  cd.writeUInt16LE(20, 4);
  cd.writeUInt16LE(20, 6);
  cd.writeUInt16LE(0x0800, 8);
  cd.writeUInt16LE(0, 10);
  cd.writeUInt16LE(0, 12);
  cd.writeUInt16LE(0, 14);
  cd.writeUInt32LE(crc, 16);
  cd.writeUInt32LE(data.length, 20);
  cd.writeUInt32LE(data.length, 24);
  cd.writeUInt16LE(nm.length, 28);
  cd.writeUInt16LE(0, 30);
  cd.writeUInt16LE(0, 32);
  cd.writeUInt16LE(0, 34);
  cd.writeUInt16LE(0, 36);
  cd.writeUInt32LE(0, 38);
  cd.writeUInt32LE(0, 42);
  const off = lh.length + nm.length + data.length;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(cd.length + nm.length, 12);
  eocd.writeUInt32LE(off, 16);
  return Buffer.concat([lh, nm, data, cd, nm, eocd]);
}

test('installUpdate propagates unpack reason (no silent unpack failed)', async () => {  const { createHash } = await import('node:crypto');
  const { writeFileSync: write } = await import('node:fs');
  const { installUpdate } = await import('../updater/lib/flow.js');
  const dir = mk();
  const zipPath = join(dir, 'p.zip');
  write(zipPath, 'pack-bytes');
  const sha = createHash('sha256').update('pack-bytes').digest('hex');
  const rep = installUpdate({
    zipPath,
    entry: { version: '1', sha },
    unpackDir: join(dir, 'u'),
    storeDir: join(dir, 's'),
    unpack: () => ({ ok: false, reason: 'zip-slip: ../evil.txt' }),
    keep: 1,
  });
  assert.equal(rep.ok, false);
  assert.match(rep.reason, /zip-slip/);
});

test('rollbackVanilla restores nested backup without statSync', async () => {
  const { rollbackVanilla } = await import('../updater/lib/dist-apply.js');
  const { mkdirSync: mkdir, writeFileSync: write, readFileSync: read } = await import('node:fs');
  const dir = mk();
  const backup = join(dir, 'bak');
  const app = join(dir, 'app');
  mkdir(join(backup, 'assets', 'deep'), { recursive: true });
  mkdir(join(app, 'assets', 'deep'), { recursive: true });
  write(join(backup, 'assets', 'a.js'), 'VANILLA-A');
  write(join(backup, 'assets', 'deep', 'b.js'), 'VANILLA-B');
  write(join(app, 'assets', 'a.js'), 'PATCHED');
  const rep = await rollbackVanilla({ appDir: app, backupDir: backup });
  assert.equal(rep.ok, true);
  assert.equal(rep.restored, 2);
  assert.equal(read(join(app, 'assets', 'a.js'), 'utf8'), 'VANILLA-A');
  assert.equal(read(join(app, 'assets', 'deep', 'b.js'), 'utf8'), 'VANILLA-B');
});
