// NEED: пак заявляет совместимость с игрой, апдейтер ставит только подходящий.
// - pack() пишет game / gameMin-gameMax в манифест; инверсия -> throw.
// - verifyPack: пак без клейма (legacy) проходит; инверсия и game вне
//   диапазона -> ошибка. Тихо кривое не едет.
// - feed: buildFeed собирает feed.json из манифестов+url; selectPack берёт
//   новейший совместимый под версию игры, иначе null (EN-фолбэк, не краш).
// - installPack: здоровая директория -> ok, битая -> ошибки verifyPack.
// Приватность: сети в прод-файлах нет — только локальные директории;
// fetch фида/zip остаётся тонким CLI-слоем релиз-инфры, не частью гейтов.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pack } from '../tools/pack-ru.mjs';
import { verifyPack } from '../tools/verify-pack.mjs';
import { buildFeed, selectPack } from '../tools/feed-ru.mjs';
import { installPack } from '../tools/update-ru.mjs';

const mk = () => mkdtempSync(join(tmpdir(), 'ruflow-'));

test('pack writes game claims, rejects inverted range', () => {
  const out = mk();
  const m = pack({ out, version: '1.3.0', game: '7553', gameMin: '7506', gameMax: '7553' });
  assert.equal(m.game, '7553');
  assert.equal(m.gameMin, '7506');
  assert.equal(m.gameMax, '7553');
  assert.throws(() => pack({ out: mk(), version: '1.3.0', gameMin: '7553', gameMax: '7506' }), /range/);
  assert.throws(
    () => pack({ out: mk(), version: '1.3.0', game: '7815', gameMin: '7506', gameMax: '7553' }),
    /range/
  );
});

test('verifyPack: legacy passes, inconsistent claims fail', () => {
  const legacy = mk();
  pack({ out: legacy, version: '1.0.0' });
  assert.deepEqual(verifyPack(legacy).errors, [], 'no claims still healthy');
  const bad = mk();
  const m = pack({ out: bad, version: '1.0.0', gameMin: '7506', gameMax: '7553' });
  m.gameMin = '7553';
  m.gameMax = '7506';
  writeFileSync(join(bad, 'locale-version.json'), JSON.stringify(m));
  const rep = verifyPack(bad);
  assert.ok(rep.errors.some((e) => e.includes('range')), JSON.stringify(rep.errors));
});

test('feed roundtrip: newest compatible wins, none -> null', () => {
  const feed = buildFeed([
    { manifest: { locale: 'ru', version: '1.0.0', game: '7506', files: ['ru.json'] }, url: 'https://example.invalid/p1.zip' },
    { manifest: { locale: 'ru', version: '1.2.0', gameMin: '7506', gameMax: '7553', files: ['ru.json'] }, url: 'https://example.invalid/p2.zip' },
    { manifest: { locale: 'ru', version: '2.0.0', game: '9999', files: ['ru.json'] }, url: 'https://example.invalid/p3.zip' },
  ]);
  const sel = selectPack(JSON.stringify(feed), '7553');
  assert.equal(sel.version, '1.2.0');
  assert.equal(sel.url, 'https://example.invalid/p2.zip');
  assert.equal(selectPack(JSON.stringify(feed), '0000'), null);
  assert.throws(() => selectPack('not json', '7553'), /feed/);
});

test('installPack: healthy ok, broken reports errors', () => {
  const good = mk();
  pack({ out: good, version: '9.9-test', game: '7553' });
  const ok = installPack(good);
  assert.equal(ok.ok, true);
  assert.ok(ok.stats.ruKeys > 2000, 'stats pass through');
  const bad = mk();
  pack({ out: bad, version: '9.9-test' });
  writeFileSync(join(bad, 'ru.json'), 'not json{');
  const rep = installPack(bad);
  assert.equal(rep.ok, false);
  assert.ok(rep.errors.length > 0, 'loud failure, never silent');
});
