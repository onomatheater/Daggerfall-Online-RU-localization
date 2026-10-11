// Установка пака: только гейт verifyPack поверх директории.
// Скачивание (GET zip -> распаковать) — тонкий слой релиз-инфры и лаунчера,
// сюда не едет: установщик не ходит в сеть и не собирает ничего о пользователе.
import { verifyPack } from './verify-pack.mjs';

export function installPack(packDir) {
  const { errors, stats } = verifyPack(packDir);
  return { ok: errors.length === 0, errors, stats };
}

if (process.argv[1]?.endsWith('update-ru.mjs')) {
  const dir = process.argv[2] ?? 'dist/ru-pack';
  const rep = installPack(dir);
  console.log(`install: ${rep.ok ? 'OK' : 'REFUSED'} errors=${rep.errors.length} stats=${JSON.stringify(rep.stats)}`);
  for (const e of rep.errors.slice(0, 20)) console.log('- ' + e);
  process.exit(rep.ok ? 0 : 1);
}
