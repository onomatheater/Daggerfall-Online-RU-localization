// probe-rebase — дешёвый ребаз пробы под новую версию игры (вариант D).
// Ноль хардкода: версии/пути/очередь — аргументы и tools/probe-queue.json.
// Два режима: dry-run (по умолчанию: только drift-отчёт, ноль мутаций)
// и --apply (снапшот stash → очередь → restore при первой ошибке).
// Патч-скрипты неидемпотентны: повторный прогон запрещён самим дизайном
// (стоп на первой ошибке + restore), а не надеждой.
import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const usageOf = () => [
  'usage: node tools/probe-rebase.mjs --scripts <dir> --clone <dir> --queue <json> --from <tag> --to <tag> [--apply] [--allow-dirty]',
  '  dry-run (default): validate queue + drift report, mutates nothing.',
  '  --apply: snapshot tracked clone tree, run queue in order, restore on failure.',
].join('\n');

export function parseArgs(argv) {
  const out = { scripts: '', clone: '', queue: '', from: '', to: '', apply: false, allowDirty: false };
  const flag = { '--scripts': 'scripts', '--clone': 'clone', '--queue': 'queue', '--from': 'from', '--to': 'to' };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--apply') { out.apply = true; continue; }
    if (argv[i] === '--allow-dirty') { out.allowDirty = true; continue; }
    const key = flag[argv[i]];
    if (!key) throw new Error(`unknown arg: ${argv[i]}\n${usageOf()}`);
    out[key] = argv[i + 1] ?? '';
    i++;
  }
  return out;
}

const isEntry = (e) =>
  e && typeof e.script === 'string' && e.script.length > 0 &&
  Array.isArray(e.touches) && e.touches.length > 0 &&
  e.touches.every((t) => typeof t === 'string' && t.length > 0);

export function loadQueue(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('queue is not JSON');
  }
  if (!parsed || !Array.isArray(parsed.order)) throw new Error('queue needs order[]');
  parsed.order.forEach((entry, i) => {
    if (!isEntry(entry)) throw new Error(`queue.order[${i}]: need {script, touches[], note?}`);
  });
  return parsed;
}

export function driftReport(queue, changedFiles) {
  const changed = new Set(changedFiles);
  return queue.order.map((entry) => ({
    script: entry.script,
    touches: entry.touches,
    touchedUpstream: entry.touches.some((f) => changed.has(f)),
  }));
}

export async function runQueue(order, scriptsDir, runOne) {
  const results = [];
  for (const entry of order) {
    const scriptPath = `${scriptsDir}/${entry.script}`;
    const ran = await runOne(scriptPath);
    results.push({ script: entry.script, ok: ran.ok, output: ran.output });
    if (!ran.ok) return { results, failedAt: entry.script };
  }
  return { results, failedAt: null };
}

export const snapshotCmds = (cloneDir) => [
  ['git', '-C', cloneDir, 'status', '--porcelain'],
  ['git', '-C', cloneDir, 'stash', 'push', '-m', 'probe-rebase-snapshot'],
];

export const discardCmds = (cloneDir) => [
  ['git', '-C', cloneDir, 'checkout', '--', '.'],
];

export const restoreCmds = (cloneDir) => [
  ['git', '-C', cloneDir, 'stash', 'pop'],
];

const untrackedOf = (porcelain) => porcelain.split('\n')
  .map((l) => l.trim())
  .filter((l) => l.startsWith('??'))
  .map((l) => l.slice(2).trim())
  .filter(Boolean);

const failedRun = (output) => output.includes('ANCHOR GONE') || output.includes('FAIL');

export async function rebase(opts, deps) {
  const queue = loadQueue(await deps.readFile(opts.queue));
  const changed = await deps.gitDiff(opts);
  const report = driftReport(queue, changed);
  if (!opts.apply) return { applied: false, report, failedAt: null };
  const preStatus = await deps.exec(['git', '-C', opts.clone, 'status', '--porcelain']);
  if (preStatus.output.trim() !== '' && !opts.allowDirty) {
    throw new Error(`clone tree dirty, refusing (use --allow-dirty to snapshot):\n${preStatus.output}`);
  }
  const pushed = await deps.exec(['git', '-C', opts.clone, 'stash', 'push', '-m', 'probe-rebase-snapshot']);
  const stashed = !/no local changes/i.test(pushed.output);
  const beforeUntracked = new Set(untrackedOf(preStatus.output));
  const queueTouches = new Set(queue.order.flatMap((e) => e.touches));
  const runOne = async (scriptPath) => {
    const ran = await deps.exec(['node', scriptPath]);
    const ok = ran.code === 0 && !failedRun(ran.output);
    return { ok, output: ran.output };
  };
  const ran = await runQueue(queue.order, opts.scripts, runOne);
  if (stashed) {
    // Чужое незакоммиченное — в stash; сбрасываем только наносное очереди.
    await deps.exec(['git', '-C', opts.clone, 'checkout', '--', '.']);
    const after = await deps.exec(['git', '-C', opts.clone, 'status', '--porcelain']);
    const created = untrackedOf(after.output).filter((f) => !beforeUntracked.has(f) && queueTouches.has(f));
    for (const f of created) await deps.exec(['git', '-C', opts.clone, 'clean', '-f', '--', f]);
    await deps.exec(['git', '-C', opts.clone, 'stash', 'pop']);
    if (ran.failedAt) return { applied: true, report: ran.results, failedAt: ran.failedAt, restored: true };
    return { applied: true, report: ran.results, failedAt: null, restored: true };
  }
  if (ran.failedAt) {
    await deps.exec(['git', '-C', opts.clone, 'checkout', '--', '.']);
    return { applied: true, report: ran.results, failedAt: ran.failedAt, restored: true };
  }
  return { applied: true, report: ran.results, failedAt: null, restored: false };
}

const realExec = (cmd) => new Promise((resolve) => {
  execFile(cmd[0], cmd.slice(1), { maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
    resolve({ code: err?.code ?? 0, output: String(stdout ?? '') + String(stderr ?? '') });
  });
});

const main = async () => {
  const opts = parseArgs(process.argv);
  if (!opts.clone || !opts.queue || !opts.from || !opts.to) {
    console.log(usageOf());
    process.exit(2);
  }
  const deps = {
    readFile: (p) => fs.promises.readFile(p, 'utf8'),
    exec: realExec,
    gitDiff: async () => {
      const ran = await realExec(['git', '-C', opts.clone, 'diff', '--name-only', `${opts.from}..${opts.to}`, '--', 'src', 'app']);
      if (ran.code !== 0) throw new Error(`git diff failed:\n${ran.output}`);
      return ran.output.split('\n').map((l) => l.trim()).filter(Boolean);
    },
  };
  try {
    const result = await rebase(opts, deps);
    for (const row of result.report) {
      const bad = row.touchedUpstream === true || row.ok === false;
      console.log(`${bad ? 'ATTN' : 'ok'} ${row.script}${row.output ? ` :: ${row.output.split('\n')[0].slice(0, 100)}` : ''}`);
    }
    if (result.failedAt) {
      console.log(`STOP at ${result.failedAt}${result.restored ? ' (tree restored)' : ''}`);
      process.exit(1);
    }
    console.log(result.applied ? 'REBASE OK' : 'DRIFT-REPORT OK (dry-run, nothing touched)');
  } catch (err) {
    console.error(`probe-rebase: ${err.message}`);
    process.exit(1);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
