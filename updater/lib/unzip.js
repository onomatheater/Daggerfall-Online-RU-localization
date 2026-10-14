// Распаковка zip пака (сторона приложения; adm-zip — dep updater-приложения,
// прод-гейты репозитория остаются без зависимостей).
import AdmZip from 'adm-zip';
import { mkdirSync } from 'node:fs';

export function unpackZip(zipPath, destDir) {
  mkdirSync(destDir, { recursive: true });
  const zip = new AdmZip(zipPath);
  // Zip-slip: записи проверяются ДО распаковки — ../ и абсолют пишут
  // за пределы destDir. Отказ громкий, ничего не извлечено.
  const bad = zip.getEntries().map((e) => e.entryName).find((n) => !isSafeZipEntry(n));
  if (bad !== undefined) throw new Error(`zip-slip: ${bad}`);
  zip.extractAllTo(destDir, true);
  return { ok: true, dir: destDir };
}

function isSafeZipEntry(name) {
  if (typeof name !== 'string' || name.length === 0 || name.includes('\0')) return false;
  if (/^[a-zA-Z]:/.test(name) || name.startsWith('/') || name.startsWith('\\')) return false;
  if (name.replace(/\\/g, '/').split('/').some((p) => p === '..')) return false;
  return true;
}

// Упаковка директории в zip для релиза (та же adm-zip, та же сторона).
export function packZip(srcDir, zipPath) {
  const zip = new AdmZip();
  zip.addLocalFolder(srcDir);
  zip.writeZip(zipPath);
  return { ok: true, zip: zipPath };
}
