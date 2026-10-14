// NEED: синк ключей без пересборки dist (Task 4).
// - keySync(upstreamEn, repoEn): сверка upstream-EN с нашими таблицами.
//   newKeys (есть в апстриме, нет у нас) → очередь синка с ТОЧНЫМ upstream-EN
//   (перевод — человек/переводчик, автомат RU запрещён); changedEn (EN уплыл) →
//   на ревью RU (перевод мог протухнуть); gone (нет в апстриме) → только
//   deprecate-кандидаты, удаление ключей запрещено.
// - Рендер новых ключей до синка: fallback ru→en→key+warn уже есть (t/wrap),
//   инструмент покрывает ОЧЕРЕДЬ, а не рендер.
// - CLI: --upstream/--en → отчёт; exit 1 при new/changed (гейт конвейера).
import test from 'node:test';
import assert from 'node:assert/strict';
import { keySync } from '../tools/key-sync.mjs';

const REPO_EN = { strings: { hello: 'Hello.', bye: 'Bye.' }, dfo: { a: 'A' } };

test('new upstream keys queue with exact EN, nothing auto-translated', () => {
  const hit = keySync(
    { strings: { hello: 'Hello.', fresh: 'Fresh thing.' }, dfo: { a: 'A' } },
    REPO_EN,
  );
  assert.deepEqual(hit.newKeys, [{ table: 'strings', key: 'fresh', en: 'Fresh thing.' }]);
  assert.deepEqual(hit.changedEn, []);
  assert.deepEqual(hit.gone, [{ table: 'strings', key: 'bye', deprecate: true }]);
});

test('changed EN flags RU review, gone flags deprecate (never delete)', () => {
  const hit = keySync(
    { strings: { hello: 'Hello there.', bye: 'Bye.' }, dfo: {} },
    REPO_EN,
  );
  assert.deepEqual(hit.changedEn, [{ table: 'strings', key: 'hello', oldEn: 'Hello.', newEn: 'Hello there.' }]);
  assert.deepEqual(hit.gone, [{ table: 'dfo', key: 'a', deprecate: true }]);
  assert.deepEqual(hit.newKeys, []);
});

test('clean sync reports empty queues', () => {
  const hit = keySync(REPO_EN, REPO_EN);
  assert.deepEqual(hit, { newKeys: [], changedEn: [], gone: [], stats: { upstream: 3, repo: 3 } });
});

test('plural-form objects compare by value, not reference', () => {
  const forms = () => ({ one: '# thing', few: '# things', many: '# things' });
  const hit = keySync({ dfo: { n: forms() } }, { dfo: { n: forms() } });
  assert.deepEqual(hit.changedEn, []);
  assert.deepEqual(hit.newKeys, []);
});
