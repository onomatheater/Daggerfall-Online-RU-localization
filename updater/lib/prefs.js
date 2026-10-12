// Префы окна апдейтера (сторона приложения): только авточек.
// Дефолт выкл — сеть только с согласия. Битый файл = дефолт, не throw.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const FILE = 'prefs.json';
export const DEFAULT_PREFS = { autoCheck: false };

export function loadPrefs(userDataDir) {
  try {
    const parsed = JSON.parse(readFileSync(join(userDataDir, FILE), 'utf8'));
    return { autoCheck: parsed?.autoCheck === true };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(userDataDir, prefs) {
  mkdirSync(userDataDir, { recursive: true });
  writeFileSync(join(userDataDir, FILE), JSON.stringify({ autoCheck: prefs?.autoCheck === true }, null, 2) + '\n');
  return loadPrefs(userDataDir);
}
