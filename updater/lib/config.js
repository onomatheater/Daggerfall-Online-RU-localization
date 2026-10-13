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

// Хром окна (рядом с WINDOW, а не россыпью в createWindow).
export const WINDOW_CHROME = {
  resizable: false,
  maximizable: false,
  autoHideMenuBar: true,
  backgroundColor: '#0a0c11',
  title: 'Обновление перевода',
};
export const ICON_FILE = 'assets/icon.ico';

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

// Раскладка протокола: имена zip/директорий пака и рецепта + путь dist
// в распакованной игре. Один источник вместо строк по main/actions.
export const RECIPE = { zip: 'recipe.zip', dir: 'recipe', file: 'recipe.json' };
export const PACK = { zip: 'ru-pack.zip', dir: 'pack' };
export const APP_DIST = ['resources', 'app', 'dist'];

// Шкала прогресса восстановления перевода: одна шкала на main
// (шаги prepare/fetch/apply + стартовый start), а не магия по call site.
export const PROGRESS = { start: 5, prepare: 20, fetch: 50, apply: 75 };

// Таймаут списка процессов: зависший tasklist/pgrep не вешает проверку.
export const PS_TIMEOUT_MS = 10000;
