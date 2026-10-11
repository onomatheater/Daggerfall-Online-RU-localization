// Детект версии игры из установки: апдейтеру не надо верить словам.
// Порядок: package.json {version} (распакованная сборка/корень установки),
// затем app-update.yml (строка `version:`, метаданные electron-updater).
// Asar не вскрываем (ноль зависимостей) — это делает лаунчер до нас.
// Нет источников или битый JSON -> {version: null, reason}, не throw:
// селектор дальше вернёт null и клиент останется на старом паке / EN.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const readText = (path) => {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
};

export function detectGameVersion(dir) {
  const pkgText = readText(join(dir, 'package.json'));
  if (pkgText !== null) {
    try {
      const pkg = JSON.parse(pkgText);
      if (pkg && typeof pkg.version === 'string' && pkg.version.length > 0) {
        return { version: pkg.version, source: 'package.json' };
      }
      return { version: null, reason: 'package.json has no version' };
    } catch {
      return { version: null, reason: 'package.json is not JSON' };
    }
  }
  const ymlText = readText(join(dir, 'app-update.yml'));
  if (ymlText !== null) {
    const line = ymlText.split('\n').find((l) => l.trimStart().startsWith('version:'));
    const version = line?.split(':').slice(1).join(':').trim();
    if (version) return { version, source: 'app-update.yml' };
    return { version: null, reason: 'app-update.yml has no version' };
  }
  return { version: null, reason: 'no package.json or app-update.yml' };
}

if (process.argv[1]?.endsWith('detect-game.mjs')) {
  const hit = detectGameVersion(process.argv[2] ?? '.');
  console.log(hit.version === null ? `unknown: ${hit.reason}` : `${hit.version} (${hit.source})`);
  process.exit(hit.version === null ? 1 : 0);
}
