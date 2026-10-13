// Загрузчик setup игры (~240 МБ): fetch инжектится, чанки идут
// в onProgress, итог — Buffer (файл пишет вызывающий слой).
// Сеть падает throw наружу: в net-error её маппит вызывающий слой
// (actions/main), здесь — только транспорт без UI-контракта.
export async function downloadBytes({ url, fetchFn = fetch, onProgress = () => {} } = {}) {
  const res = await fetchFn(url);
  if (!res || res.ok !== true) {
    throw new Error(`download: ${url} answered ${res?.status ?? 'nothing'}`);
  }
  const rawTotal = res.headers?.get?.('content-length');
  const total = rawTotal !== null && rawTotal !== undefined && rawTotal !== '' ? Number(rawTotal) : null;
  const chunks = [];
  let received = 0;
  for await (const chunk of res.body) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    chunks.push(buf);
    received += buf.length;
    onProgress({ received, total: Number.isFinite(total) ? total : null });
  }
  return Buffer.concat(chunks);
}

export function formatBytes(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return '0 B';
  if (v < 1024) return `${Math.floor(v)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = v / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(1)} ${units[unit]}`;
}

// Гейт места ДО закачки: freeBytes инжектится (в окне — statfsSync),
// обрыв 240-МБ файла посередине исключён отказом заранее.
export function checkDiskSpace(dir, needBytes, { freeBytes } = {}) {
  if (typeof freeBytes !== 'function') return { ok: false, reason: 'disk check failed: need freeBytes probe' };
  let free;
  try {
    free = freeBytes(dir);
  } catch (err) {
    return { ok: false, reason: `disk check failed: ${err?.message ?? err}` };
  }
  if (typeof free !== 'number' || !Number.isFinite(free)) {
    return { ok: false, reason: 'disk check failed: unreadable free space' };
  }
  if (free < needBytes) {
    return { ok: false, reason: `no disk space: need ${formatBytes(needBytes)}, free ${formatBytes(free)}` };
  }
  return { ok: true };
}
