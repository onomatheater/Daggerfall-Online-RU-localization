import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseArgs, loadQueue, driftReport, runQueue, snapshotCmds, restoreCmds, rebase,
} from '../tools/probe-rebase.mjs';

// probe-rebase: дешёвый ребаз пробы под новую версию игры.
// Ядро — чистые функции + инъекции (exec/readFile), ноль хардкода:
// версии, пути и очередь приходят аргументами/конфигом.

test('parseArgs: defaults + overrides', () => {
  const d = parseArgs(['node', 'probe-rebase.mjs']);
  assert.equal(d.scripts, '');
  assert.equal(d.clone, '');
  assert.equal(d.queue, '');
  assert.equal(d.from, '');
  assert.equal(d.to, '');
  assert.equal(d.apply, false);
  assert.equal(d.allowDirty, false);
  const o = parseArgs(['node', 'x', '--scripts', 'S', '--clone', 'C', '--queue', 'Q', '--from', 'A', '--to', 'B', '--apply']);
  assert.deepEqual(o, { scripts: 'S', clone: 'C', queue: 'Q', from: 'A', to: 'B', apply: true, allowDirty: false });
});

test('loadQueue: valid config passes', () => {
  const q = loadQueue(JSON.stringify({ order: [
    { script: 'patch-anchor.mjs', touches: ['src/scenes/hostMagic.js'], note: 'anchor' },
  ] }));
  assert.equal(q.order.length, 1);
  assert.equal(q.order[0].script, 'patch-anchor.mjs');
});

test('loadQueue: names the broken entry', () => {
  assert.throws(() => loadQueue(JSON.stringify({ order: [{ touches: ['x.js'] }] })), /script/);
  assert.throws(() => loadQueue(JSON.stringify({ order: [{ script: 'a.mjs', touches: [] }] })), /touches/);
  assert.throws(() => loadQueue('not json'), /JSON/);
  assert.throws(() => loadQueue(JSON.stringify({})), /order/);
});

test('driftReport: marks entries touched upstream', () => {
  const q = { order: [
    { script: 'a.mjs', touches: ['src/ui/enhancedMenu.js'], note: '' },
    { script: 'b.mjs', touches: ['src/main.js'], note: '' },
  ] };
  const r = driftReport(q, ['src/ui/enhancedMenu.js', 'README.md']);
  assert.equal(r[0].touchedUpstream, true);
  assert.equal(r[1].touchedUpstream, false);
});

test('runQueue: order kept, stops at first failure', async () => {
  const seen = [];
  const runOne = async (p) => { seen.push(p); return p.endsWith('b.mjs') ? { ok: false, output: 'ANCHOR GONE' } : { ok: true, output: 'patched' }; };
  const r = await runQueue([{ script: 'a.mjs' }, { script: 'b.mjs' }, { script: 'c.mjs' }], 'S', runOne);
  assert.deepEqual(seen, ['S/a.mjs', 'S/b.mjs']);
  assert.equal(r.failedAt, 'b.mjs');
  assert.equal(r.results.length, 2);
});

test('snapshot/restore: exact git command sequences', () => {
  assert.deepEqual(snapshotCmds('/s'), [
    ['git', '-C', '/s', 'status', '--porcelain'],
    ['git', '-C', '/s', 'stash', 'push', '-m', 'probe-rebase-snapshot'],
  ]);
  assert.deepEqual(restoreCmds('/s'), [
    ['git', '-C', '/s', 'stash', 'pop'],
  ]);
});

test('rebase dry-run: no mutations, drift only', async () => {
  const calls = [];
  const deps = {
    readFile: async (p) => {
      calls.push(['read', p]);
      if (p === 'Q') return JSON.stringify({ order: [{ script: 'a.mjs', touches: ['x.js'], note: '' }] });
      throw new Error('unexpected read ' + p);
    },
    exec: async (cmd) => { calls.push(['exec', ...cmd]); return { code: 0, output: '' }; },
    gitDiff: async () => ['x.js', 'other.js'],
  };
  const r = await rebase({ scripts: 'S', clone: 'C', queue: 'Q', from: 'A', to: 'B', apply: false }, deps);
  assert.equal(r.applied, false);
  assert.equal(r.report[0].touchedUpstream, true);
  assert.ok(!calls.some((c) => c[0] === 'exec' && c.includes('stash')), 'dry-run mutates nothing');
});

test('rebase apply: refuses dirty tree without snapshot charm', async () => {
  const deps = {
    readFile: async () => JSON.stringify({ order: [{ script: 'a.mjs', touches: ['x.js'], note: '' }] }),
    exec: async (cmd) => {
      if (cmd.includes('status')) return { code: 0, output: ' M dirty.js\n' };
      return { code: 0, output: '' };
    },
    gitDiff: async () => [],
  };
  await assert.rejects(
    rebase({ scripts: 'S', clone: 'C', queue: 'Q', from: 'A', to: 'B', apply: true, allowDirty: false }, deps),
    /dirty/,
  );
});

test('rebase apply: snapshot, run, restore on failure', async () => {
  const cmds = [];
  const deps = {
    readFile: async () => JSON.stringify({ order: [
      { script: 'a.mjs', touches: ['x.js'], note: '' },
      { script: 'b.mjs', touches: ['y.js'], note: '' },
    ] }),
    exec: async (cmd) => {
      cmds.push(cmd.join(' '));
      if (cmd.includes('status')) return { code: 0, output: '' };
      if (cmd.includes('push')) return { code: 0, output: 'Saved working directory' };
      if (cmd.join(' ').endsWith('b.mjs')) return { code: 1, output: 'ANCHOR GONE' };
      return { code: 0, output: 'patched' };
    },
    gitDiff: async () => [],
  };
  const r = await rebase({ scripts: 'S', clone: 'C', queue: 'Q', from: 'A', to: 'B', apply: true, allowDirty: true }, deps);
  assert.equal(r.failedAt, 'b.mjs');
  assert.ok(cmds.some((c) => c.includes('stash push')), 'snapshot taken');
  assert.ok(cmds.some((c) => c.includes('checkout -- .')), 'patch changes discarded');
  assert.ok(cmds.some((c) => c.includes('stash pop')), 'restored after failure');
});

test('rebase apply success on dirty tree: user work popped back', async () => {
  const cmds = [];
  const deps = {
    readFile: async () => JSON.stringify({ order: [{ script: 'a.mjs', touches: ['x.js'], note: '' }] }),
    exec: async (cmd) => {
      cmds.push(cmd.join(' '));
      if (cmd.includes('status')) return { code: 0, output: ' M keep.js\n' };
      if (cmd.includes('push')) return { code: 0, output: 'Saved working directory' };
      return { code: 0, output: 'patched' };
    },
    gitDiff: async () => [],
  };
  const r = await rebase({ scripts: 'S', clone: 'C', queue: 'Q', from: 'A', to: 'B', apply: true, allowDirty: true }, deps);
  assert.equal(r.failedAt, null);
  assert.ok(cmds.some((c) => c.includes('stash pop')), 'user work restored on success');
});

test('rebase apply on clean tree: no phantom pop', async () => {
  const cmds = [];
  const deps = {
    readFile: async () => JSON.stringify({ order: [{ script: 'a.mjs', touches: ['x.js'], note: '' }] }),
    exec: async (cmd) => {
      cmds.push(cmd.join(' '));
      if (cmd.includes('status')) return { code: 0, output: '' };
      if (cmd.includes('push')) return { code: 0, output: 'No local changes to save' };
      return { code: 0, output: 'patched' };
    },
    gitDiff: async () => [],
  };
  await rebase({ scripts: 'S', clone: 'C', queue: 'Q', from: 'A', to: 'B', apply: true, allowDirty: true }, deps);
  assert.ok(!cmds.some((c) => c.includes('stash pop')), 'no pop without snapshot');
});
