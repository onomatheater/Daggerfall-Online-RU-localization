// NEED: «Играть» по правилу canPlay (Task A апдейтер-ревью).
// - resolveGameExe(gameDir): DFO Online.exe в корне или в гнезде DFO Online/
//   (переезд 13.10), legacy Daggerfall Online.exe последним. Нет exe -> null.
// - launchGame({gameDir, spawn}): нет exe -> {ok:false}; spawn кидает ->
//   {ok:false, reason}; успех -> {ok:true}. spawn инжектится (тест — стаб).
// - view: play.enabled = игра известна (version) и не занят (не busy).
//   Было всегда-disabled (заглушка) — чиним их правилом canPlay.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveGameExe, launchGame } from '../updater/lib/launch.js';

const mk = () => mkdtempSync(join(tmpdir(), 'ruplay-'));
const touch = (p) => writeFileSync(p, '');

test('resolveGameExe prefers nested DFO Online.exe, then root, then legacy', () => {
  const nested = mk();
  mkdirSync(join(nested, 'DFO Online'));
  touch(join(nested, 'DFO Online', 'DFO Online.exe'));
  assert.equal(resolveGameExe(nested), join(nested, 'DFO Online', 'DFO Online.exe'));
  const root = mk();
  touch(join(root, 'DFO Online.exe'));
  mkdirSync(join(root, 'DFO Online'));
  touch(join(root, 'DFO Online', 'DFO Online.exe'));
  assert.equal(resolveGameExe(root), join(root, 'DFO Online.exe'));
  const legacy = mk();
  touch(join(legacy, 'Daggerfall Online.exe'));
  assert.equal(resolveGameExe(legacy), join(legacy, 'Daggerfall Online.exe'));
  assert.equal(resolveGameExe(mk()), null);
});

test('launchGame launches, reports missing exe and spawn failure', () => {
  const dir = mk();
  touch(join(dir, 'DFO Online.exe'));
  const launched = [];
  const hit = launchGame({
    gameDir: dir,
    spawn: (exe, args, opts) => { launched.push([exe, args, opts]); return { unref: () => {} }; },
  });
  assert.equal(hit.ok, true);
  assert.equal(launched[0][0], join(dir, 'DFO Online.exe'));
  assert.equal(launched[0][2].detached, true);
  assert.equal(launchGame({ gameDir: mk(), spawn: () => ({ unref: () => {} }) }).ok, false);
  const boom = launchGame({
    gameDir: dir,
    spawn: () => { throw new Error('boom'); },
  });
  assert.equal(boom.ok, false);
  assert.match(String(boom.reason), /launch failed/);
});

test('view enables Play when game known and idle', async () => {
  const { viewOf } = await import('../updater/lib/view.js');
  const base = { installed: [], check: null, busy: false, prefs: {}, gameDir: 'C:\\Game' };
  const known = viewOf({ ...base, game: { version: '0.1.8404', source: 'app.asar' } });
  assert.equal(known.play.enabled, true);
  const unknown = viewOf({ ...base, game: { version: null, reason: 'app.asar unreadable' } });
  assert.equal(unknown.play.enabled, false);
  const busy = viewOf({ ...base, game: { version: '0.1.8404', source: 'app.asar' }, busy: true });
  assert.equal(busy.play.enabled, false);
});
