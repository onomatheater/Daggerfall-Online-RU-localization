// Разовая миграция asar -> распакованная папка (сторона приложения).
// Дальше игра живёт распакованной: обновления — обычными копиями,
// пересборка asar не нужна никогда. asar-чтение для миграции — через
// @electron/asar (dep приложения).
// Атомарность: чужой бэкап не затираем; asar удаляется только после
// проверки распаковки (сентинел package.json — его же читает детект
// версии). Провал -> throw с причиной, asar цел, свои артефакты убраны.
import { extractAll } from '@electron/asar';
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';

export async function ensureUnpacked({ resourcesDir, backupPath } = {}) {
  const asarPath = join(resourcesDir, 'app.asar');
  const appDir = join(resourcesDir, 'app');
  if (!existsSync(asarPath)) return { migrated: false, reason: 'already-unpacked' };
  const hadBackup = backupPath !== undefined && existsSync(backupPath);
  const hadAppDir = existsSync(appDir);
  if (backupPath !== undefined && !hadBackup) {
    mkdirSync(dirname(backupPath), { recursive: true });
    copyFileSync(asarPath, backupPath);
  }
  const dropOwnBackup = () => {
    if (backupPath !== undefined && !hadBackup) rmSync(backupPath, { force: true });
  };
  try {
    extractAll(asarPath, appDir);
  } catch (err) {
    dropOwnBackup();
    if (!hadAppDir) rmSync(appDir, { recursive: true, force: true });
    throw new Error(`migrate: extract failed: ${err.message}`);
  }
  if (!existsSync(join(appDir, 'package.json'))) {
    dropOwnBackup();
    if (!hadAppDir) rmSync(appDir, { recursive: true, force: true });
    throw new Error('migrate: extracted tree has no package.json');
  }
  rmSync(asarPath);
  return { migrated: true, appDir, backupPath };
}
