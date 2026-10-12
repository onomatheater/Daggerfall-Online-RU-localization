// Чтение package.json из app.asar установленной игры (сторона приложения;
// @electron/asar — dep апдейтера, ядро репозитория без зависимостей).
import { extractFile } from '@electron/asar';

export function readAsarPackageJson(asarPath) {
  const bytes = extractFile(asarPath, 'package.json');
  return JSON.parse(Buffer.from(bytes).toString('utf8'));
}
