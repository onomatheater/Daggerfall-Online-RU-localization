// Гейты публикации паков: что угодно красное — стоим, зовём человека.
// Пишем только packs/** на main; публикация — явный прогон, дефолт dry-run.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, posix } from 'node:path';
import { spawnSync } from 'node:child_process';

export function gatesOk(report = {}) {
  return report.build === true && report.markers === true && report.pack === true && report.probe === true;
}

const defaultSh = ({ args, cwd }) => {
  const hit = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (hit.status !== 0) {
    throw new Error(`git ${args.join(' ')}: ${String(hit.stderr ?? '').slice(0, 200)}`);
  }
  return String(hit.stdout ?? '').trim();
};

const norm = (p) => String(p ?? '').split('\\').join('/');

export async function publishPack({ repoDir, files = [], message, dryRun = true, sh = defaultSh } = {}) {
  if (typeof repoDir !== 'string' || repoDir.length === 0) throw new Error('publish: need repoDir');
  if (typeof message !== 'string' || message.length === 0) throw new Error('publish: need message');
  const paths = files.map((f) => norm(f?.path));
  const bad = paths.find((p) => !p.startsWith('packs/') || p.includes('..'));
  if (bad !== undefined || paths.length === 0) {
    return { ok: false, reason: `publish: only packs/** allowed, got: ${bad ?? '(empty)'}` };
  }
  if (dryRun) return { published: false, paths };
  let status;
  try {
    status = sh({ args: ['status', '--porcelain'], cwd: repoDir });
  } catch (err) {
    return { ok: false, reason: `publish: status failed: ${err.message}` };
  }
  const dirtyOutside = String(status)
    .split('\n')
    .map((l) => l.slice(3).trim().replace(/^"(.*)"$/, '$1'))
    .filter((l) => l.length > 0)
    .some((l) => !norm(l).startsWith('packs/'));
  if (dirtyOutside) return { ok: false, reason: 'publish: tree dirty outside packs/' };
  const branch = sh({ args: ['branch', '--show-current'], cwd: repoDir });
  if (branch !== 'main') return { ok: false, reason: `publish: not on main (${branch})` };
  try {
    for (const file of files) {
      const dest = join(repoDir, norm(file.path));
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, file.content);
    }
    sh({ args: ['add', 'packs'], cwd: repoDir });
    sh({ args: ['commit', '-m', message], cwd: repoDir });
    sh({ args: ['push', 'origin', 'main'], cwd: repoDir });
  } catch (err) {
    return { ok: false, reason: `publish: ${err.message}` };
  }
  return { ok: true, paths };
}
