// Применение рецепта к распакованной установке (resources/app):
// asar-хирургия отменена пробой 12.10 — игра штатно стартует из папки.
// Порядок: цели delete на месте (нет — отказ, дерево не тронуто) ->
// маркеры в добавляемом (нет — отказ) -> rm + write. Отказ = дерево цело.
// Ноль зависимостей. Распаковка asar — разовая миграция (см. unpack.js).
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';

// Путь рецепта обязан сидеть внутри appDir: только относительные пути без
// ..-сегментов, абсолюта, букв дисков и nul-байтов. Сетевой рецепт с ../
// иначе пишет/удаляет за пределами игры (траверс).
export function isSafeRel(rel) {
  if (typeof rel !== 'string' || rel.length === 0 || rel.includes('\0')) return false;
  if (/^[a-zA-Z]:/.test(rel) || rel.startsWith('/') || rel.startsWith('\\')) return false;
  const parts = rel.replace(/\\/g, '/').split('/');
  if (parts.some((p) => p === '..' || p === '')) return false;
  return true;
}

// Декод add-записи в байты. Только строгий shape {path, content, encoding:'base64'}:
// legacy-utf8 и мусор отказываются громко, а не пишутся молча.
function decodeFile(file) {
  if (!file || typeof file.path !== 'string' || typeof file.content !== 'string' || file.encoding !== 'base64') {
    return null;
  }
  const norm = file.content.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(norm)) return null;
  const bytes = Buffer.from(norm, 'base64');
  if (bytes.toString('base64') !== norm) return null;
  return { path: file.path, bytes };
}

function decodeAdd(add) {
  const out = [];
  for (const file of add ?? []) {
    const hit = decodeFile(file);
    if (hit === null) return null;
    out.push(hit);
  }
  return out;
}

export async function applyRecipe({ appDir, recipe, backupDir } = {}) {
  if (!recipe || !Array.isArray(recipe.add) || !Array.isArray(recipe.delete)) {
    return { ok: false, reason: 'bad recipe shape' };
  }
  const unsafe = [...recipe.delete, ...recipe.add.map((f) => f?.path)].find((p) => !isSafeRel(p));
  if (unsafe !== undefined) return { ok: false, reason: `bad recipe shape: unsafe path ${unsafe}` };
  const missing = recipe.delete.filter((rel) => !existsSync(join(appDir, rel)));
  if (missing.length > 0) return { ok: false, reason: `base mismatch, missing: ${missing.slice(0, 3).join(',')}` };
  const decoded = decodeAdd(recipe.add);
  if (decoded === null) return { ok: false, reason: 'bad recipe shape: entry is not base64' };
  const markers = recipe.markers ?? [];
  const haystack = decoded.map((f) => f.bytes.toString('utf8')).join('\n');
  const lost = markers.filter((m) => !haystack.includes(m));
  if (lost.length > 0) return { ok: false, reason: `markers lost: ${lost.slice(0, 3).join(',')}` };
  try {
    if (backupDir !== undefined) {
      for (const rel of [...recipe.delete, ...decoded.map((f) => f.path)]) {
        const src = join(appDir, rel);
        if (!existsSync(src)) continue;
        const dest = join(backupDir, rel);
        mkdirSync(dirname(dest), { recursive: true });
        copyFileSync(src, dest);
      }
    }
    for (const rel of recipe.delete) rmSync(join(appDir, rel), { force: true });
    for (const file of decoded) {
      const dest = join(appDir, file.path);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, file.bytes);
    }
    return { ok: true, applied: decoded.length, removed: recipe.delete.length };
  } catch (err) {
    return { ok: false, reason: `apply failed: ${err.message}` };
  }
}

// Возврат ванильных копий из бэкапа (откат перевода, не трогая остальное).
export async function rollbackVanilla({ appDir, backupDir } = {}) {
  const rels = [];
  const walk = (dir, base = dir) => {
    let names;
    try {
      // Dirent вместо statSync: висячий симлинк/гонка прав не роняет
      // обход throw наружу — нечитаемое пропускается, как пустое.
      names = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of names) {
      const full = join(dir, ent.name);
      if (ent.isDirectory()) walk(full, base);
      else rels.push(relative(base, full).split(sep).join('/'));
    }
  };
  walk(backupDir);
  if (rels.length === 0) return { ok: false, reason: 'empty backup' };
  try {
    for (const rel of rels) {
      const dest = join(appDir, rel);
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(join(backupDir, rel), dest);
    }
    return { ok: true, restored: rels.length };
  } catch (err) {
    return { ok: false, reason: `rollback failed: ${err.message}` };
  }
}
export function verifyApplied({ appDir, recipe } = {}) {
  const decoded = decodeAdd(recipe.add ?? []);
  if (decoded === null) return { ok: false, reason: 'bad recipe shape: entry is not base64' };
  const unsafe = decoded.map((f) => f.path).find((p) => !isSafeRel(p));
  if (unsafe !== undefined) return { ok: false, reason: `bad recipe shape: unsafe path ${unsafe}` };
  for (const file of decoded) {
    let text;
    try {
      text = readFileSync(join(appDir, file.path));
    } catch {
      return { ok: false, reason: `missing after apply: ${file.path}` };
    }
    if (!text.equals(file.bytes)) return { ok: false, reason: `content mismatch: ${file.path}` };
  }
  return { ok: true };
}
