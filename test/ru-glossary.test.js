import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ru = JSON.parse(fs.readFileSync(new URL('../src/locale/ru.json', import.meta.url), 'utf8'));

// Глоссарий: spell → только «заклинание» (-ание), варианты «заклятие» запрещены.
test('glossary: no заклят- forms in spell/item tables', () => {
  const bad = [];
  for (const t of ['spells', 'items', 'magicitems']) {
    for (const [k, v] of Object.entries(ru[t] ?? {})) {
      if (typeof v === 'string' && /заклят/iu.test(v)) bad.push(`${t}:${k}=${v}`);
    }
  }
  assert.deepEqual(bad, []);
});
