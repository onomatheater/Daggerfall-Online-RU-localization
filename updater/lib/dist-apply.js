// Применение рецепта к распакованной установке (resources/app):
// asar-хирургия отменена пробой 12.10 — игра штатно стартует из папки.
// Порядок: цели delete на месте (нет — отказ, дерево не тронуто) ->
// маркеры в добавляемом (нет — отказ) -> rm + write. Отказ = дерево цело.
// Ноль зависимостей. Распаковка asar — разовая миграция (см. unpack.js).
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';

export async function applyRecipe({ appDir, recipe, backupDir } = {}) {
  if (!recipe || !Array.isArray(recipe.add) || !Array.isArray(recipe.delete)) {
    return { ok: false, reason: 'bad recipe shape' };
  }
  const missing = recipe.delete.filter((rel) => !existsSync(join(appDir, rel)));
  if (missing.length > 0) return { ok: false, reason: `base mismatch, missing: ${missing.slice(0, 3).join(',')}` };
  const markers = recipe.markers ?? [];
  const haystack = recipe.add.map((f) => f.content).join('\n');
  const lost = markers.filter((m) => !haystack.includes(m));
  if (lost.length > 0) return { ok: false, reason: `markers lost: ${lost.slice(0, 3).join(',')}` };
  try {
    if (backupDir !== undefined) {
      for (const rel of [...recipe.delete, ...recipe.add.map((f) => f.path)]) {
        const src = join(appDir, rel);
        if (!existsSync(src)) continue;
        const dest = join(backupDir, rel);
        mkdirSync(dirname(dest), { recursive: true });
        copyFileSync(src, dest);
      }
    }
    for (const rel of recipe.delete) rmSync(join(appDir, rel), { force: true });
    for (const file of recipe.add) {
      const dest = join(appDir, file.path);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, file.content, 'utf8');
    }
    return { ok: true, applied: recipe.add.length, removed: recipe.delete.length };
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
      names = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of names) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full, base);
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
  for (const file of recipe.add ?? []) {
    let text;
    try {
      text = readFileSync(join(appDir, file.path), 'utf8');
    } catch {
      return { ok: false, reason: `missing after apply: ${file.path}` };
    }
    if (!text.includes(file.content.slice(0, 64))) return { ok: false, reason: `content mismatch: ${file.path}` };
  }
  return { ok: true };
}
