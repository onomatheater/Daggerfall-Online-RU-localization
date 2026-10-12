// NEED: окно как у разработчиков (их лаунчер — MIT, с упоминанием).
// - prefs авто-проверки: loadPrefs/savePrefs roundtrip (дефолт выкл).
// - decideStartup: авточек только при включённом флаге и известной игре.
// - describeIssue: net-error по-русски.
// Сеть по-прежнему только по действию пользователя; авточек — молча
// (их закон DA6: авто = тишина, ручная проверка = громко).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadPrefs, savePrefs } from '../updater/lib/prefs.js';
import { describeIssue, decideStartup } from '../updater/lib/flow.js';

const mk = () => mkdtempSync(join(tmpdir(), 'ruprefs-'));

test('prefs roundtrip, default off', () => {
  const dir = mk();
  assert.deepEqual(loadPrefs(dir), { autoCheck: false });
  savePrefs(dir, { autoCheck: true });
  assert.deepEqual(loadPrefs(dir), { autoCheck: true });
  savePrefs(dir, { autoCheck: false });
  assert.deepEqual(loadPrefs(dir), { autoCheck: false });
});

test('prefs survive broken file as default, never throw', () => {
  const dir = mk();
  writeFileSync(join(dir, 'prefs.json'), 'not json{');
  assert.deepEqual(loadPrefs(dir), { autoCheck: false });
});

test('decideStartup: silent check only when opted in with known game', () => {
  assert.equal(decideStartup({ autoCheck: true, gameVersion: '0.1.7815' }), 'check');
  assert.equal(decideStartup({ autoCheck: false, gameVersion: '0.1.7815' }), 'idle');
  assert.equal(decideStartup({ autoCheck: true, gameVersion: null }), 'idle');
});

test('describeIssue maps net-error to Russian', () => {
  assert.ok(describeIssue('net-error').includes('соединения'));
});
