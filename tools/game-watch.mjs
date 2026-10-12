// Вотчер версий игры для конвейера: есть ли upstream-тег новее,
// чем max клеймо в packs/feed.json. Чистая логика, ноль сети:
// JSON приходит готовым, решения — наружу. Мусор с любой стороны —
// null (тишина, их закон DA6: ложное «есть обнова» хуже пропущенной).
import { canonGameVersion } from '../src/locale/loader.js';
import updateCheck from '../updater/vendor-dfo/updateCheck.cjs';

const tagOf = (entry) => (entry && typeof entry.tag_name === 'string' ? entry.tag_name : null);

function maxTag(tags) {
  let best = null;
  for (const tag of tags) {
    if (updateCheck.parseReleaseTag(tag) === null) continue;
    if (best === null || updateCheck.isNewerRelease(best.replace(/^app-v/, ''), tag)) best = tag;
  }
  return best;
}

export function latestGameTag(releasesJsonText) {
  let list;
  try {
    list = JSON.parse(String(releasesJsonText));
  } catch {
    return null;
  }
  if (!Array.isArray(list)) return null;
  return maxTag(list.map(tagOf).filter((t) => t !== null));
}

function maxClaimedBuild(feed) {
  let best = null;
  for (const pack of feed?.packs ?? []) {
    const claim = pack?.gameMax ?? pack?.game;
    if (typeof claim !== 'string') continue;
    const build = canonGameVersion(claim);
    if (!/^\d+$/.test(build)) continue;
    if (best === null || Number(build) > Number(best)) best = build;
  }
  return best;
}

export function pendingUpdate(feedJsonText, releasesJsonText) {
  const tag = latestGameTag(releasesJsonText);
  if (tag === null) return null;
  let feed;
  try {
    feed = JSON.parse(String(feedJsonText));
  } catch {
    return null;
  }
  if (!feed || !Array.isArray(feed.packs)) return null;
  const version = tag.replace(/^app-v/, '');
  const claimed = maxClaimedBuild(feed);
  if (claimed !== null && Number(canonGameVersion(version)) <= Number(claimed)) return null;
  return { tag, version };
}
