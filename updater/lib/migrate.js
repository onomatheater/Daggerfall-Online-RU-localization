// Разовая миграция asar -> распакованная папка (сторона приложения).
// Дальше игра живёт распакованной: обновления — обычными копиями,
// пересборка asar не нужна никогда. asar-чтение для миграции — через
// @electron/asar (dep приложения).
import { extractAll } from '@electron/asar';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

export async function ensureUnpacked({ resourcesDir, backupPath } = {}) {
  const asarPath = join(resourcesDir, 'app.asar');
  const appDir = join(resourcesDir, 'app');
  if (!existsSync(asarPath)) return { migrated: false, reason: 'already-unpacked' };
  mkdirSync(dirname(backupPath), { recursive: true });
  copyFileSync(asarPath, backupPath);
  extractAll(asarPath, appDir);
  const { rmSync } = await import('node:fs');
  rmSync(asarPath);
  return { migrated: true, appDir, backupPath };
}
