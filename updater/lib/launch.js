// Запуск игры из лаунчера (Task A апдейтер-ревью).
// Правило кнопки — их canPlay: игра известна + ничего не ставится.
// Сам запуск — detached spawn exe (переезд 13.10: гнездо DFO Online).
// spawn инжектится (тест — стаб, приложение — node:child_process).
// Отказ — {ok:false, reason}, никогда throw.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn as nodeSpawn } from 'node:child_process';

export function resolveGameExe(gameDir) {
  if (typeof gameDir !== 'string' || gameDir.length === 0) return null;
  const candidates = [
    join(gameDir, 'DFO Online.exe'),
    join(gameDir, 'DFO Online', 'DFO Online.exe'),
    join(gameDir, 'Daggerfall Online.exe'),
  ];
  for (const exe of candidates) {
    try {
      if (existsSync(exe)) return exe;
    } catch {
      continue;
    }
  }
  return null;
}

export function launchGame({ gameDir, spawn = nodeSpawn } = {}) {
  const exe = resolveGameExe(gameDir);
  if (exe === null) return { ok: false, reason: 'no game exe: install folder has no launcher exe' };
  try {
    const child = spawn(exe, [], { detached: true, stdio: 'ignore' });
    if (child && typeof child.unref === 'function') child.unref();
    return { ok: true, exe };
  } catch (err) {
    return { ok: false, reason: `launch failed: ${err?.message ?? err}` };
  }
}
