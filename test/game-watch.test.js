// NEED: конвейер узнаёт о новой версии игры без глаз и рук.
// - latestGameTag(releasesJsonText): свежий тег app-v* из списка релизов
//   их API; site-теги и мусор пропускаются, итог null (тишина, закон DA6).
// - pendingUpdate(feedJsonText, releasesJsonText): latest-тег против max
//   клейма в packs/feed.json (gameMax ?? game, канон с обеих сторон);
//   новее -> {tag, version}, иначе null. Отдельного стейта нет.
import test from 'node:test';
import assert from 'node:assert/strict';
import { latestGameTag, pendingUpdate } from '../tools/game-watch.mjs';

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
