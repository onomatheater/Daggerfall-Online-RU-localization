// Ванильный dist версии игры: сборка тега из исходников (vite build),
// без NSIS/7z (их сетап не разбираем — спайк 12.10 показал, что 7z на
// машине нет, а клон тега и так нужен конвейеру для пропатченной сборки).
// Итог копируется в outDir для сверки рецептом; провал — throw без огрызков.
import { statSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

export function distReady(distDir) {
  try {
    if (!statSync(join(distDir, 'index.html')).isFile()) return false;
    if (!statSync(join(distDir, 'assets')).isDirectory()) return false;
    return true;
  } catch {
    // Нет файла/прав/висячий симлинк — не готов, а не throw в лицо CI.
    return false;
  }
}

export const defaultRun = ({ cmd = 'npm', args, cwd }) => {
  const hit = spawnSync(cmd, args, { cwd, encoding: 'utf8', shell: process.platform === 'win32' });
  if (hit.status !== 0) return { ok: false, reason: String(hit.stderr ?? hit.error ?? 'build failed').slice(0, 300) };
  return { ok: true };
};

export async function buildVanilla({ cloneDir, outDir, run = defaultRun } = {}) {
  const built = await run({ cmd: 'npm', cwd: cloneDir, args: ['run', 'build'] });
  if (!built || built.ok !== true) {
    throw new Error(`vanilla-dist: build failed: ${built?.reason ?? 'unknown'}`);
  }
  const src = join(cloneDir, 'dist');
  if (!distReady(src)) throw new Error('vanilla-dist: built tree has no index.html/assets');
  try {
    mkdirSync(outDir, { recursive: true });
    cpSync(src, outDir, { recursive: true });
    if (!distReady(outDir)) throw new Error('vanilla-dist: copy failed sentinel');
  } catch (err) {
    rmSync(outDir, { recursive: true, force: true });
    if (String(err?.message ?? '').startsWith('vanilla-dist:')) throw err;
    throw new Error(`vanilla-dist: copy failed: ${err.message}`);
  }
  return { ok: true, outDir };
}
