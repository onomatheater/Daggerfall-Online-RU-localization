// Действия апдейтера без Electron: main.js лишь передаёт замыкания
// (game/loadFeed/fetch/unpack), решения и статусы — здесь и в тестах.
// Битый фид виден как bad-feed с причиной, сеть — net-error: баги парсинга
// больше не маскируются под отсутствие соединения.
import { join } from 'node:path';
import { checkForUpdate, installUpdate } from './flow.js';

export async function runCheck({ gameVersion, gameReason, currentVersion, loadFeed, feedConfigured = true } = {}) {
  if (typeof gameVersion !== 'string' || gameVersion.length === 0) {
    return { status: 'unknown-game', reason: gameReason ?? 'unknown' };
  }
  if (!feedConfigured) return { status: 'feed-unconfigured' };
  let text;
  try {
    text = await loadFeed();
  } catch (err) {
    // Сеть тиха в UI по DA6, но в консоль пишем: маскировка багов кончилась.
    if (typeof console !== 'undefined') console.error('[updater] feed load failed:', err);
    return { status: 'net-error' };
  }
  // Фид наш, но битый (сеть побила/свалили руками): это не net-error.
  // checkForUpdate бросает только из selectPack — все его ошибки вида 'feed: …'.
  try {
    return checkForUpdate({ feedText: text, gameVersion, currentVersion });
  } catch (err) {
    return { status: 'bad-feed', reason: String(err?.message ?? err) };
  }
}

export async function runInstall({ entry, fetchZip, unpack, storeDir, prefsDir, mkTmp, rmTmp, keep } = {}) {
  const tmp = mkTmp();
  try {
    const zipPath = join(tmp, 'ru-pack.zip');
    try {
      await fetchZip(entry.url, zipPath);
    } catch (err) {
      if (typeof console !== 'undefined') console.error('[updater] fetchZip failed:', err);
      return { ok: false, reason: 'net-error' };
    }
    return installUpdate({ zipPath, entry, unpackDir: join(tmp, 'pack'), storeDir, unpack, keep, prefsDir });
  } finally {
    rmTmp(tmp);
  }
}
