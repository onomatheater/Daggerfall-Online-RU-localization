// Установка пака: только гейт verifyPack поверх директории.
// Скачивание (GET zip -> распаковать) — тонкий слой релиз-инфры и лаунчера,
// сюда не едет: установщик не ходит в сеть и не собирает ничего о пользователе.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync } from 'node:fs';
import { join, normalize, isAbsolute, relative, sep } from 'node:path';
import { verifyPack } from './verify-pack.mjs';

export function installPack(packDir) {
  const { errors, stats } = verifyPack(packDir);
  return { ok: errors.length === 0, errors, stats };
}

// Установка проверенного пака в Prefs-локаль игры (<userData>/Prefs/Locale/ru):
// гейт installPack → копируем ровно manifest.files[] + locale-version.json.
// Траверс (`..`, абсолют, выход за пак) — отказ ДО единой записи.
// Отказ — {ok:false, reason}, никогда throw.
export function installPackToPrefs(packDir, prefsDir) {
  const gate = installPack(packDir);
  if (!gate.ok) return { ok: false, reason: `refused pack: ${gate.errors.slice(0, 3).join('; ')}` };
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(packDir, 'locale-version.json'), 'utf8'));
  } catch (err) {
    return { ok: false, reason: `refused pack: manifest unreadable: ${err.message}` };
  }
  const wanted = [...(manifest.files ?? []), 'locale-version.json'];
  const plan = [];
  for (const rel of wanted) {
    if (typeof rel !== 'string' || rel.length === 0 || isAbsolute(rel)) {
      return { ok: false, reason: `refused pack: outside file: ${rel}` };
    }
    const norm = normalize(rel).split(sep).join('/');
    if (norm === '..' || norm.startsWith('../') || norm.includes('/../') || norm.endsWith('/..')) {
      return { ok: false, reason: `refused pack: traversal outside file: ${rel}` };
    }
    const src = join(packDir, norm);
    if (relative(packDir, src).startsWith('..')) {
      return { ok: false, reason: `refused pack: traversal outside file: ${rel}` };
    }
    plan.push({ rel: norm, src, dest: join(prefsDir, norm) });
  }
  try {
    for (const { src, dest } of plan) {
      mkdirSync(join(dest, '..'), { recursive: true });
      copyFileSync(src, dest);
    }
  } catch (err) {
    return { ok: false, reason: `prefs write failed: ${err.message}` };
  }
  return { ok: true, installed: plan.map((p) => p.rel) };
}

// Сверка скачанного zip с sha из фида — до распаковки и installPack.
// Подменённый/битый файл дальше не идёт. Файла нет -> {ok:false}, не throw.
export function verifyFileSha(path, expected) {
  let bytes;
  try {
    bytes = readFileSync(path);
  } catch {
    return { ok: false, reason: `missing file: ${path}` };
  }
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== String(expected).toLowerCase()) {
    return { ok: false, reason: `sha mismatch: expected ${expected}, got ${actual}` };
  }
  return { ok: true, sha: actual };
}

if (process.argv[1]?.endsWith('update-ru.mjs')) {
  const dir = process.argv[2] ?? 'dist/ru-pack';
  const rep = installPack(dir);
  console.log(`install: ${rep.ok ? 'OK' : 'REFUSED'} errors=${rep.errors.length} stats=${JSON.stringify(rep.stats)}`);
  for (const e of rep.errors.slice(0, 20)) console.log('- ' + e);
  process.exit(rep.ok ? 0 : 1);
}
