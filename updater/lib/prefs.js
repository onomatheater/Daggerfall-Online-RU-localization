// Префы окна апдейтера (сторона приложения): авточек и папка игры.
// Дефолт выкл, папка пуста — сеть и чтение только с согласия.
// Битый файл = дефолт, не throw.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const FILE = 'prefs.json';
export const DEFAULT_PREFS = { autoCheck: false, gameDir: '' };

const clean = (parsed) => ({
  autoCheck: parsed?.autoCheck === true,
  gameDir: typeof parsed?.gameDir === 'string' ? parsed.gameDir : '',
});

export function loadPrefs(userDataDir) {
  try {
    return clean(JSON.parse(readFileSync(join(userDataDir, FILE), 'utf8')));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(userDataDir, prefs) {
  mkdirSync(userDataDir, { recursive: true });
  writeFileSync(join(userDataDir, FILE), JSON.stringify(clean(prefs), null, 2) + '\n');
  return loadPrefs(userDataDir);
}
