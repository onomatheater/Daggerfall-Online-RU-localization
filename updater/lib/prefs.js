// Префы окна апдейтера (сторона приложения): авточек и папка игры.
// Дефолт выкл, папка пуста — сеть и чтение только с согласия.
// Битый файл сдвигается в бэкап prefs.corrupt-*.bak (папка не теряется
// молча), возвращается дефолт. Файла нет — дефолт без бэкапа.
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const FILE = 'prefs.json';
export const DEFAULT_PREFS = { autoCheck: false, gameDir: '' };

const clean = (parsed) => ({
  autoCheck: parsed?.autoCheck === true,
  gameDir: typeof parsed?.gameDir === 'string' ? parsed.gameDir : '',
});

export function loadPrefs(userDataDir) {
  const file = join(userDataDir, FILE);
  let raw;
  try {
    raw = readFileSync(file, 'utf8');
  } catch {
    return { ...DEFAULT_PREFS };
  }
  try {
    return clean(JSON.parse(raw));
  } catch {
    try {
      renameSync(file, join(userDataDir, `prefs.corrupt-${Date.now()}.bak`));
    } catch {
      // Бэкап не встал — дефолт всё равно возвращаем, не throw.
    }
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(userDataDir, prefs) {
  mkdirSync(userDataDir, { recursive: true });
  writeFileSync(join(userDataDir, FILE), JSON.stringify(clean(prefs), null, 2) + '\n');
  return loadPrefs(userDataDir);
}
