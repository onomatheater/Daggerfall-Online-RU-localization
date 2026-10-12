// Путь Prefs-локали игры: <userData>/Prefs/Locale/ru (вне resources/app —
// обновление игры его не сносит). userData — факт апстрима (dfjs app/main.cjs):
// appData/'Daggerfall JavaScript', переопределение DAGGER_USER_DATA.
// Чистая функция поверх параметров: окружение не читаем (тестируемо),
// платформу/дом/APPData передаёт вызывающий (апдейтер).
import { join } from 'node:path';

export function resolveGameLocaleDir({ platform = process.platform, env = {}, home = '' } = {}) {
  const base = env.DAGGER_USER_DATA && String(env.DAGGER_USER_DATA).length > 0
    ? env.DAGGER_USER_DATA
    : join(appDataDir({ platform, env, home }), 'Daggerfall JavaScript');
  return join(base, 'Prefs', 'Locale', 'ru');
}

function appDataDir({ platform, env, home }) {
  if (platform === 'win32') return env.APPDATA ?? join(home, 'AppData', 'Roaming');
  if (platform === 'darwin') return join(home, 'Library', 'Application Support');
  if (typeof env.XDG_CONFIG_HOME === 'string' && env.XDG_CONFIG_HOME.length > 0) return env.XDG_CONFIG_HOME;
  return join(home, '.config');
}
