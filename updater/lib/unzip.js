// Распаковка zip пака (сторона приложения; adm-zip — dep updater-приложения,
// прод-гейты репозитория остаются без зависимостей).
import AdmZip from 'adm-zip';
import { mkdirSync } from 'node:fs';

export function unpackZip(zipPath, destDir) {
  mkdirSync(destDir, { recursive: true });
  new AdmZip(zipPath).extractAllTo(destDir, true);
  return { ok: true, dir: destDir };
}

// Упаковка директории в zip для релиза (та же adm-zip, та же сторона).
export function packZip(srcDir, zipPath) {
  const zip = new AdmZip();
  zip.addLocalFolder(srcDir);
  zip.writeZip(zipPath);
  return { ok: true, zip: zipPath };
}
