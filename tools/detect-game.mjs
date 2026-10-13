// Детект версии игры из установки: апдейтеру не надо верить словам.
// Порядок: package.json {version} (распакованная сборка/корень установки),
// затем app-update.yml (строка `version:`, метаданные electron-updater).
// Asar не вскрываем (ноль зависимостей) — это делает лаунчер до нас.
// Нет источников или битый JSON -> {version: null, reason}, не throw:
// селектор дальше вернёт null и клиент останется на старом паке / EN.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const readText = (path) => {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
};

// Маркер установки в папке: хоть один источник версии на месте.
// Пустой корень (переезд игры на уровень вниз — переименование
// «Daggerfall Online» → «DFO Online», факт 13.10) — смотрим во вложенные.
const hasMarkers = (dir) =>
  existsSync(join(dir, 'package.json')) ||
  existsSync(join(dir, 'app-update.yml')) ||
  existsSync(join(dir, 'resources', 'app.asar'));

const nestedCandidates = (dir) => {
  let names;
  try {
    names = readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1));
  } catch {
    // Нечитаемая директория — кандидатов нет, дальше смотрит detectAt.
    return [];
  }
  return names
    .filter((ent) => ent.isDirectory())
    .map((ent) => join(dir, ent.name))
    .filter((full) => hasMarkers(full));
};

export function detectGameVersion(dir, { readAsar } = {}) {
  const at = (target) => detectAt(target, { readAsar });
  const root = at(dir);
  if (root.version !== null || hasMarkers(dir)) return root;
  for (const candidate of nestedCandidates(dir)) {
    const hit = at(candidate);
    if (hit.version !== null) return hit;
  }
  return root;
}

function detectAt(dir, { readAsar } = {}) {
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
  // Установленная игра держит package.json внутри resources/app.asar.
  // Читалка инжектится (ядро без зависимостей; asar-ридер живёт в приложении).
  if (typeof readAsar === 'function') {
    try {
      const pkg = readAsar(join(dir, 'resources', 'app.asar'));
      if (pkg && typeof pkg.version === 'string' && pkg.version.length > 0) {
        return { version: pkg.version, source: 'app.asar' };
      }
      return { version: null, reason: 'app.asar package.json has no version' };
    } catch {
      return { version: null, reason: 'app.asar unreadable' };
    }
  }
  return { version: null, reason: 'no package.json or app-update.yml' };
}

if (process.argv[1]?.endsWith('detect-game.mjs')) {
  const hit = detectGameVersion(process.argv[2] ?? '.');
  console.log(hit.version === null ? `unknown: ${hit.reason}` : `${hit.version} (${hit.source})`);
  process.exit(hit.version === null ? 1 : 0);
}
