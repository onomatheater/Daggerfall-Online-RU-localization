// Применение рецепта к installed app.asar (сторона приложения).
// Порядок: цели delete на месте (нет — отказ, asar не тронут) -> extract ->
// apply ops -> маркеры (нет — отказ) -> repack. Отказ = asar побайтово цел.
// Бэкап asar перед вызовом — обязанность шелла (main).
import { extractFile, listPackage, extractAll, createPackage, uncache } from '@electron/asar';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

// Windows-сборки asar хранят сегменты с бэкслешами, posix — со слешами,
// а поиск идёт посегментно через path.sep без ведущего сепаратора.
// Сравниваем нормализованно, иначе настоящий asar не узнаем.
import { sep } from 'node:path';
const normRel = (p) => String(p).replace(/^[/\\]+/, '').split(/[/\\]+/);
const hasIn = (names, rel) => {
  const want = JSON.stringify(normRel(rel));
  return names.some((n) => JSON.stringify(normRel(n)) === want);
};

export async function applyRecipe({ asarPath, recipe } = {}) {
  if (!recipe || !Array.isArray(recipe.add) || !Array.isArray(recipe.delete) || !Array.isArray(recipe.markers ?? [])) {
    return { ok: false, reason: 'bad recipe shape' };
  }
  const markers = recipe.markers ?? [];
  let names;
  try {
    names = listPackage(asarPath);
  } catch {
    return { ok: false, reason: 'asar unreadable' };
  }
  const missing = recipe.delete.filter((rel) => !hasIn(names, rel));
  if (missing.length > 0) return { ok: false, reason: `base mismatch, missing: ${missing.slice(0, 3).join(',')}` };
  const work = mkdtempSync(join(tmpdir(), 'rurecipe-'));
  try {
    extractAll(asarPath, join(work, 'app'));
    const root = join(work, 'app');
    for (const rel of recipe.delete) rmSync(join(root, rel), { force: true });
    for (const file of recipe.add) {
      const dest = join(root, file.path);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, file.content, 'utf8');
    }
    const haystack = recipe.add.map((f) => f.content).join('\n');
    const lost = markers.filter((m) => !haystack.includes(m));
    if (lost.length > 0) return { ok: false, reason: `markers lost: ${lost.slice(0, 3).join(',')}` };
    await createPackage(root, asarPath);
    // Библиотека кэширует заголовки по пути в процессе: без сброса
    // последующие чтения в том же процессе увидят старый asar.
    uncache(asarPath);
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: `apply failed: ${err.message}` };
  }
}
