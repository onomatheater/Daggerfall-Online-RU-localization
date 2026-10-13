// NEED батча Б: setup ~240 МБ качается с прогрессом и проверкой места.
// - downloadBytes: fetch инжектится (стаб в тесте, глобальный в окне),
//   чанки идут в onProgress({received, total}), итог — Buffer;
// - checkDiskSpace: freeBytes инжектится (в окне — fs.statfsSync),
//   мало места — громкий отказ ДО закачки, а не обрыв посередине.
import test from 'node:test';
import assert from 'node:assert/strict';

import { downloadBytes, checkDiskSpace, formatBytes } from '../updater/lib/download.js';

const chunked = (parts) => async (url) => ({
  ok: true,
  status: 200,
  headers: { get: (n) => (n.toLowerCase() === 'content-length' ? String(parts.join('').length) : null) },
  body: (async function* () {
    for (const p of parts) yield Buffer.from(p);
  })(),
});

test('download: bytes assembled, progress monotonic with total', async () => {
  const seen = [];
  const buf = await downloadBytes({
    url: 'https://dl/dfo/setup.exe',
    fetchFn: chunked(['ab', 'cde', 'f']),
    onProgress: (p) => seen.push({ ...p }),
  });
  assert.equal(buf.toString('utf8'), 'abcdef');
  assert.ok(seen.length === 3, 'one report per chunk, got ' + seen.length);
  assert.deepEqual(seen[2], { received: 6, total: 6 });
  for (let i = 1; i < seen.length; i++) assert.ok(seen[i].received >= seen[i - 1].received, 'monotonic');
});

test('download: bad status refuses loudly', async () => {
  const rep = await downloadBytes({
    url: 'https://dl/dfo/setup.exe',
    fetchFn: async () => ({ ok: false, status: 404, headers: { get: () => null }, body: (async function* () {})() }),
    onProgress: () => {},
  }).then(
    () => ({ ok: true }),
    (err) => ({ ok: false, reason: String(err?.message ?? err) }),
  );
  assert.equal(rep.ok, false);
  assert.match(rep.reason, /404/);
});

test('download: network throw propagates (caller maps to net-error)', async () => {
  await assert.rejects(
    downloadBytes({ url: 'https://dl/x', fetchFn: async () => { throw new Error('down'); }, onProgress: () => {} }),
    /down/,
  );
});

test('disk: freeBytes gate before download', () => {
  assert.deepEqual(checkDiskSpace('/games/dfo', 240_000_000, { freeBytes: () => 500_000_000 }), { ok: true });
  const rep = checkDiskSpace('/games/dfo', 240_000_000, { freeBytes: () => 100_000_000 });
  assert.equal(rep.ok, false);
  assert.match(rep.reason, /no disk space/);
  assert.match(rep.reason, /228\.9 MB/);
  const unreadable = checkDiskSpace('/games/dfo', 10, { freeBytes: () => { throw new Error('denied'); } });
  assert.equal(unreadable.ok, false);
  assert.match(unreadable.reason, /disk check failed/);
});

test('formatBytes: human sizes for reasons', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(239810427), '228.7 MB');
  assert.equal(formatBytes(1024), '1.0 KB');
});
