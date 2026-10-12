// NEED: предыдущие zip остаются на диске, откат — выбор прошлого, не переустановка.
// - storePack(storeDir, {srcPath, version, game, sha?, keep?}) кладёт копию
//   zip в хранилище, пишет запись в index.json, режет хвост до keep
//   (дефолт 3); возвращает {ok:true, stored, pruned[]}.
// - listPacks(storeDir) отдаёт записи от новых к старым; пусто -> [].
// - rollbackPack(storeDir) отдаёт предпоследнюю запись (куда откатываться)
//   или null, если откатываться некуда. Не throw на пустом/битом индексе.
// Локальный fs, ноль сети, ничего о пользователе.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { storePack, listPacks, rollbackPack } from '../tools/pack-store.mjs';

const mk = () => mkdtempSync(join(tmpdir(), 'rustore-'));
const zip = (dir, name, bytes) => {
  const path = join(dir, name);
  writeFileSync(path, bytes);
  return path;
};

test('store keeps newest, prunes tail, lists newest-first', () => {
  const store = mk();
  const src = mk();
  for (const v of ['1.0.0', '1.1.0', '1.2.0', '1.3.0']) {
    const rep = storePack(store, { srcPath: zip(src, `p-${v}.zip`, `bytes-${v}`), version: v, game: '7553', keep: 3 });
    assert.equal(rep.ok, true);
  }
  const list = listPacks(store);
  assert.deepEqual(list.map((e) => e.version), ['1.3.0', '1.2.0', '1.1.0']);
  assert.ok(!existsSync(join(store, 'ru-pack-1.0.0.zip')), 'tail pruned from disk');
  const index = JSON.parse(readFileSync(join(store, 'index.json'), 'utf8'));
  assert.equal(index.length, 3, 'index matches disk');
});

test('store keeps entry notes for the news feed', () => {
  const store = mk();
  const src = mk();
  storePack(store, { srcPath: zip(src, 'p.zip', 'bytes'), version: '1.0.0', game: '7553', notes: ['Чейнджлог.'] });
  assert.deepEqual(listPacks(store)[0].notes, ['Чейнджлог.']);
});

test('rollback gives previous entry, null when nothing to roll back to', () => {
  const store = mk();
  const src = mk();
  assert.equal(rollbackPack(store), null, 'empty store');
  storePack(store, { srcPath: zip(src, 'p-1.0.0.zip', 'a'), version: '1.0.0', game: '7553' });
  assert.equal(rollbackPack(store), null, 'single pack');
  storePack(store, { srcPath: zip(src, 'p-1.1.0.zip', 'b'), version: '1.1.0', game: '7553' });
  const prev = rollbackPack(store);
  assert.equal(prev.version, '1.0.0');
  assert.ok(existsSync(join(store, prev.file)), 'rollback target exists on disk');
});

test('broken index never throws, behaves as empty', () => {
  const store = mk();
  writeFileSync(join(store, 'index.json'), 'not json{');
  assert.deepEqual(listPacks(store), []);
  assert.equal(rollbackPack(store), null);
});
