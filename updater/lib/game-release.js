// Выбор файла обновления игры из GitHub-релиза + проверка его целостности.
// Каноника имени — DFO-Online (см. latest.yml path), DaggerfallOnline —
// запасной вариант тех же ассетов. Метаданные целостности — latest*.yml
// (sha512 base64 + size), не API: без лимита запросов и с подписью каждого файла.
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Платформа -> токен в имени ассета + yml + тип установщика.
const PLATFORMS = {
  win32: { token: 'win-x64', kind: '-setup.exe', meta: 'latest.yml' },
  darwin: { token: 'mac-arm64', kind: '.dmg', meta: 'latest-mac.yml' },
  linux: { token: 'linux-x86_64', kind: '.AppImage', meta: 'latest-linux.yml' },
};

export function selectGameAsset(release, platform = process.platform) {
  const fail = (reason) => ({ ok: false, reason });
  const plat = PLATFORMS[platform];
  if (!plat) return fail(`game asset: unsupported platform ${platform}`);
  const assets = release?.assets;
  if (!Array.isArray(assets)) return fail('game asset: release has no assets[]');
  const byName = new Map(assets.map((a) => [a?.name, a]));
  const pick = (prefix) => byName.get(`${prefix}-${plat.token}${plat.kind}`) ?? null;
  const installer = pick('DFO-Online') ?? pick('DaggerfallOnline');
  if (!installer || typeof installer.browser_download_url !== 'string') {
    return fail(`game asset: no installer for ${platform} in ${release?.tag_name ?? 'release'}`);
  }
  const meta = byName.get(plat.meta) ?? null;
  if (!meta || typeof meta.browser_download_url !== 'string') {
    return fail(`game asset: no ${plat.meta} in ${release?.tag_name ?? 'release'}`);
  }
  return {
    ok: true,
    tag: release?.tag_name ?? '',
    version: String(release?.tag_name ?? '').replace(/^app-v/, ''),
    installer: { name: installer.name, url: installer.browser_download_url, size: installer.size },
    meta: { name: meta.name, url: meta.browser_download_url, size: meta.size },
  };
}

// Минимальный парсер electron-updater latest*.yml: только version +
// files[] {url, sha512, size}. Полный YAML не тянем (ноль зависимостей);
// чужой shape отказывается громко, а не молча.
export function parseLatestYml(text) {
  const fail = (msg) => { throw new Error(`latest.yml: ${msg}`); };
  const lines = String(text ?? '').split('\n');
  let version = null;
  const files = [];
  let cur = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^version:\s*/.test(line)) {
      version = line.replace(/^version:\s*/, '').trim();
      continue;
    }
    const item = line.match(/^\s*-\s*url:\s*(.+)$/);
    if (item) {
      cur = { url: item[1].trim() };
      files.push(cur);
      continue;
    }
    if (cur) {
      const sha = line.match(/^\s*sha512:\s*(.+)$/);
      if (sha) {
        cur.sha512 = sha[1].trim();
        continue;
      }
      const size = line.match(/^\s*size:\s*(\d+)$/);
      if (size) {
        cur.size = Number(size[1]);
      }
    }
  }
  if (!version) fail('need version');
  const good = files.filter((f) => f.url && f.sha512 && Number.isFinite(f.size));
  if (good.length === 0) fail('need files[] with {url, sha512, size}');
  return { version, files: good };
}

// Сверка скачанного setup: размер, затем base64-sha512 из yml.
// Отказ — {ok:false, reason}, никогда throw (тест — стаб StatSync? нет:
// читает диск напрямую, как verifyFileSha в tools/update-ru.mjs).
export function verifyGameSha(filePath, { sha512, size } = {}) {
  let st;
  try {
    st = statSync(filePath);
  } catch {
    return { ok: false, reason: `missing file: ${filePath}` };
  }
  if (typeof size === 'number' && st.size !== size) {
    return { ok: false, reason: `size mismatch: ${filePath} is ${st.size}, yml says ${size}` };
  }
  if (typeof sha512 === 'string') {
    let digest;
    try {
      digest = createHash('sha512').update(readFileSync(filePath)).digest('base64');
    } catch (err) {
      return { ok: false, reason: `unreadable file: ${filePath}: ${err?.message ?? err}` };
    }
    if (digest !== sha512) return { ok: false, reason: `sha mismatch: ${filePath}` };
  }
  return { ok: true };
}
