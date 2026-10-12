// Распаковка zip пака (сторона приложения; adm-zip — dep updater-приложения,
// прод-гейты репозитория остаются без зависимостей).
import AdmZip from 'adm-zip';
import { mkdirSync } from 'node:fs';

export function unpackZip(zipPath, destDir) {
  mkdirSync(destDir, { recursive: true });
  new AdmZip(zipPath).extractAllTo(destDir, true);
  return { ok: true, dir: destDir };
}
