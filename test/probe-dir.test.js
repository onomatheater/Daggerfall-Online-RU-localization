// NEED: дефолт песочницы — не захардкоженный путь одной машины.
// Порядок: CLI-аргумент -> DFJS_SRC -> песочница (§0.1 AGENTS.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveProbeDir, SANDBOX_DFJS_SRC } from '../tools/probe-dir.mjs';

test('probe dir: cli wins, then env, then sandbox', () => {
  assert.equal(resolveProbeDir('/cli', { DFJS_SRC: '/env' }), '/cli');
  assert.equal(resolveProbeDir(undefined, { DFJS_SRC: '/env' }), '/env');
  assert.equal(resolveProbeDir(undefined, {}), SANDBOX_DFJS_SRC);
  assert.ok(SANDBOX_DFJS_SRC.length > 0);
});
