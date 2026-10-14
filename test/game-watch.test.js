// NEED: конвейер узнаёт о новой версии игры без глаз и рук.
// - latestGameTag(releasesJsonText): свежий тег app-v* из списка релизов
//   их API; site-теги и мусор пропускаются, итог null (тишина, закон DA6).
// - pendingUpdate(feedJsonText, releasesJsonText): latest-тег против max
//   клейма в packs/feed.json (gameMax ?? game, канон с обеих сторон);
//   новее -> {tag, version}, иначе null. Отдельного стейта нет.
import test from 'node:test';
import assert from 'node:assert/strict';
import { latestGameTag, latestGameTagYml, pendingUpdate, pendingUpdateYml } from '../tools/game-watch.mjs';

const RELEASES = JSON.stringify([
  { tag_name: 'app-v0.1.7506' },
  { tag_name: 'site-123' },
  { tag_name: 'app-v0.1.7553' },
  { tag_name: 'garbage' },
]);
const FEED_7524 = JSON.stringify({ packs: [{ version: '1.0.0', gameMin: '7506', gameMax: '7524' }] });

test('latestGameTag picks newest app tag, skips site and garbage', () => {
  assert.equal(latestGameTag(RELEASES), 'app-v0.1.7553');
  assert.equal(latestGameTag(JSON.stringify([{ tag_name: 'site-9' }])), null);
  assert.equal(latestGameTag('not json'), null);
  assert.equal(latestGameTag(JSON.stringify({})), null);
});

test('pendingUpdate compares latest tag against feed claims', () => {
  const hit = pendingUpdate(FEED_7524, RELEASES);
  assert.deepEqual(hit, { tag: 'app-v0.1.7553', version: '0.1.7553' });
  const same = pendingUpdate(
    JSON.stringify({ packs: [{ version: '1.0.0', gameMin: '7506', gameMax: '7553' }] }),
    RELEASES,
  );
  assert.equal(same, null);
  assert.deepEqual(pendingUpdate(JSON.stringify({ packs: [] }), RELEASES), {
    tag: 'app-v0.1.7553',
    version: '0.1.7553',
  });
  assert.equal(pendingUpdate('not json', RELEASES), null);
  assert.equal(pendingUpdate(FEED_7524, 'not json'), null);
});

const YML_8404 = 'version: 0.1.8404\nfiles:\n  - url: DFO-Online-win-x64-setup.exe\n';

test('latestGameTagYml reads version line, garbage is silence', () => {
  assert.equal(latestGameTagYml(YML_8404), 'app-v0.1.8404');
  assert.equal(latestGameTagYml('provider: github\n'), null);
  assert.equal(latestGameTagYml('not yml {{{'), null);
  assert.equal(latestGameTagYml(''), null);
});

test('pendingUpdateYml compares yml tag against feed claims', () => {
  assert.deepEqual(pendingUpdateYml(FEED_7524, YML_8404), { tag: 'app-v0.1.8404', version: '0.1.8404' });
  assert.equal(pendingUpdateYml('not json', YML_8404), null);
  assert.equal(pendingUpdateYml(FEED_7524, 'garbage'), null);
});

test('floor-only pack covers all newer (open range needs no release)', () => {
  const feed = JSON.stringify({ packs: [{ version: '1.0.0', gameMin: '8127' }] });
  assert.equal(pendingUpdate(feed, RELEASES), null);
  assert.equal(pendingUpdateYml(feed, YML_8404), null);
});
