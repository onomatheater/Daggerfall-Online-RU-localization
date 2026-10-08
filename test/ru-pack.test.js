import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

test('pack builder assembles versioned directory with manifest', () => {
  const out = mkdtempSync(join(tmpdir(), 'rupack-'));
  execFileSync('node', ['tools/pack-ru.mjs', '--out', out, '--version', '0.4.0-test'], { cwd: new URL('..', import.meta.url) });
  const manifest = JSON.parse(readFileSync(join(out, 'locale-version.json'), 'utf8'));
  assert.equal(manifest.version, '0.4.0-test');
  assert.equal(manifest.locale, 'ru');
  for (const f of manifest.files) assert.equal(existsSync(join(out, f)), true, f);
  assert.ok(manifest.files.includes('ru.json'), 'tables included');
  assert.ok(manifest.files.some((f) => f.endsWith('.woff2')), 'font included');
});

test('demo page is self-contained (works from file://)', () => {
  const html = readFileSync(new URL('../demo/locale-switch.html', import.meta.url), 'utf8');
  assert.match(html, /Handjet/);
  assert.match(html, /setLocale/);
  assert.match(html, /Кк Ыы/);
  assert.doesNotMatch(html, /from '\.\.\/src/, 'no module imports: file:// CORS');
  assert.match(html, /Изумруд/, 'sample data inlined');
});
