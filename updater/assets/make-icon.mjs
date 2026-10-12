// Пересборка assets/icon.ico из icon-src.png (png-to-ico, devDep).
// Запуск: npm run icons. Готовый icon.ico коммитится, dist его не генерирует.
import pngToIco from 'png-to-ico';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const buf = await pngToIco(join(dir, 'icon-src.png'));
writeFileSync(join(dir, 'icon.ico'), buf);
console.log(`icon.ico: ${buf.length} bytes`);
