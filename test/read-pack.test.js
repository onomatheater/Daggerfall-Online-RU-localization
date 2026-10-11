// NEED: распакованный пак превращается в registerPack-форму без рук.
// - readPackDir(packDir) читает locale-version.json + ru.json, отдаёт
//   {manifest, tables}; дальше registerPack решает по гейту.
// - Нет манифеста / битый ru.json -> throw с понятной ошибкой
//   (лаунчер показывает причину, молча не едет).
// Zip-распаковка — тонкий слой клиента/лаунчера, сюда не едет.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pack } from '../tools/pack-ru.mjs';
import { readPackDir } from '../tools/load-pack.mjs';
import { registerPack, setGameVersion, setLocale, wrapLiteral } from '../inject/locale-adapter.js';

const mk = () => mkdtempSync(join(tmpdir(), 'ruload-'));

test('packed dir loads into registerPack shape and serves RU', () => {
  const dir = mk();
  pack({ out: dir, version: '1.3.0', gameMin: '7506', gameMax: '7553' });
  const loaded = readPackDir(dir);
  assert.equal(loaded.manifest.version, '1.3.0');
  assert.ok(loaded.tables.dfo && typeof loaded.tables.dfo === 'object', 'tables present');
  setLocale('ru');
  setGameVersion('7553');
  const rep = registerPack(loaded);
  assert.equal(rep.ok, true);
  assert.equal(typeof wrapLiteral('dfo:menu.newGame', {}), 'string');
});

test('missing manifest or broken ru.json throws loudly', () => {
  assert.throws(() => readPackDir(mk()), /manifest|locale-version/);
  const dir = mk();
  pack({ out: dir, version: '1.0.0' });
  writeFileSync(join(dir, 'ru.json'), 'not json{');
  assert.throws(() => readPackDir(dir), /ru\.json/);
});
