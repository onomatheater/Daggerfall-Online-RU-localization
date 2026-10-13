// Один источник констант апдейтера: URL, окно, лимиты ленты, имена exe,
// префиксы tmp, таймаут. Раньше россыпью по main.js/flow.js/launch.js
// (дрейфовали независимо); flow.js реэкспортирует своё для совместимости.
export const FEED_PACKS_BASE = 'https://raw.githubusercontent.com/onomatheater/Daggerfall-Online-RU-localization/main/packs';
export const DEFAULT_FEED_URL = `${FEED_PACKS_BASE}/feed.json`;
export const GAME_RELEASES_PAGE = 'https://github.com/Lattymoy/daggerfall-js-source/releases/latest';
export const GAME_API_LATEST = 'https://api.github.com/repos/Lattymoy/daggerfall-js-source/releases/latest';
export const GAME_API_LIST = 'https://api.github.com/repos/Lattymoy/daggerfall-js-source/releases?per_page=5';

// Ссылки разработчиков — те же, что в их лаунчере (Lattymoy, MIT).
export const LINKS = {
  site: 'https://daggerfalljs.dev/',
  discord: 'https://discord.gg/jM2JdwSM8w',
};

export const WINDOW = { width: 960, height: 600 };

// Лента новостей: сколько релизов, обрезка тела и даты.
export const NEWS = { perPage: 5, bodyMax: 2000, dateLen: 10 };

// Гнездо exe игры по приоритету (переезд 13.10: DFO Online).
export const EXE_NAMES = ['DFO Online.exe', 'DFO Online/DFO Online.exe', 'Daggerfall Online.exe'];

// Префиксы наших tmp-директорий (подбор мусора в pruneTmp).
export const TMP_PREFIXES = ['ruapp-', 'rurecipe-'];

// Дефолтная папка игры на винде; LOCALAPPDATA нет — пустая строка,
// дальше вид скажет «папка не указана», а не битый путь.
export function defaultGameDir(env = process.env) {
  const base = env?.LOCALAPPDATA ?? '';
  return base.length > 0 ? `${base}\\Programs\\Daggerfall Online` : '';
}

// Таймаут списка процессов: зависший tasklist/pgrep не вешает проверку.
export const PS_TIMEOUT_MS = 10000;
