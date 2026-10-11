import test from 'node:test';
import assert from 'node:assert/strict';
import { scanRegistry, scanCalls } from '../tools/registry-scan.mjs';

// NEED: надёжный экстрактор реестр-строк (замена regex-костылям: 3 сбоя —
// обрезка склеек, якорь $, двойные кавычки). Ноль зависимостей, честная
// RISK-очередь вместо молчаливых потерь. Источник форм — каталог исследования.

const SRC = `// a 'description: fake' in comment must not match
'windfall': Object.freeze({
  title: 'Windfall',
  keys: Object.freeze({
    Enabled: Object.freeze({
      default: true,
      description: 'Wind in the outdoors ' + 'that changes.',
    }),
    "Quoted.Key": Object.freeze({ default: 1, description: "Double quoted 100%." }),
    Escaped: Object.freeze({ default: 1, description: 'It\\u2019s \\'quoted\\" done.' }),
    Tpl: Object.freeze({ default: 1, description: \`plain template\` }),
    DynTpl: Object.freeze({ default: 1, description: \`by \${mod.author}\` }),
    ...spreadKeys,
  }),
});
`;

test('registry-scan: literals, continuations, both quotes, escapes', () => {
  const { records, risks } = scanRegistry(SRC);
  const byKey = new Map(records.map((r) => [r.path.join('.') + '.' + r.field, r]));
  assert.equal(byKey.get('windfall.keys.Enabled.description').value, 'Wind in the outdoors that changes.');
  assert.deepEqual(byKey.get('windfall.keys.Enabled.description').path, ['windfall', 'keys', 'Enabled']);
  assert.equal(byKey.get('windfall.keys.Quoted.Key.description').value, 'Double quoted 100%.');
  assert.equal(byKey.get('windfall.keys.Escaped.description').value, 'It\u2019s \'quoted" done.');
  assert.equal(byKey.get('windfall.keys.Tpl.description').value, 'plain template');
  assert.ok(risks.length >= 2, 'expected risks for DynTpl + spread, got ' + JSON.stringify(risks));
});

test('registry-scan: dynamic template and spread go to risks, not records', () => {
  const { records, risks } = scanRegistry(SRC);
  const keys = records.map((r) => r.path.join('.') + '.' + r.field);
  assert.ok(!keys.some((k) => k.includes('DynTpl')), 'dynamic template must not be a record');
  assert.ok(!keys.some((k) => k.includes('spread')), 'spread must not be a record');
  const kinds = risks.map((r) => r.kind).sort();
  assert.ok(kinds.includes('dynamic-value'), 'missing dynamic-value risk: ' + JSON.stringify(kinds));
  assert.ok(kinds.includes('spread'), 'missing spread risk: ' + JSON.stringify(kinds));
});

test('registry-scan: comments never match, unterminated is a risk', () => {
  const { records, risks } = scanRegistry(SRC + `\nBroken: Object.freeze({ description: 'oops,\n});\n`);
  assert.ok(!records.some((r) => String(r.value).includes('fake')), 'comment text leaked');
  assert.ok(risks.some((r) => r.kind === 'unterminated'), 'missing unterminated risk');
});

test('registry-scan: fields filter', () => {
  const { records } = scanRegistry(SRC, { fields: ['title'] });
  assert.ok(records.length > 0 && records.every((r) => r.field === 'title'));
  assert.ok(records.some((r) => r.value === 'Windfall'));
});

test('registry-scan: array rows get index path', () => {
  const { records } = scanRegistry(`export const FEATURES = Object.freeze([
  Object.freeze({ id: 'wind', title: 'Wind', note: 'Blows.' }),
  Object.freeze({ id: 'grass', title: 'Grass' }),
]);`, { fields: ['title', 'note'] });
  const byPath = new Map(records.map((r) => [r.path.join('.') + '.' + r.field, r.value]));
  assert.equal(byPath.get('0.title'), 'Wind');
  assert.equal(byPath.get('0.note'), 'Blows.');
  assert.equal(byPath.get('1.title'), 'Grass');
});

test('registry-scan: call args (tab/sec titles)', () => {
  const { records, risks } = scanCalls(`tab("graphics", "Graphics", [
    sec("quality", "Quality", ["GUI/Quality"]),
    sec('dq', "Double" + ' quoted', []),
  ]);`, [{ name: 'tab', args: [1] }, { name: 'sec', args: [1] }]);
  const vals = records.map((r) => r.value);
  assert.deepEqual(vals, ['Graphics', 'Quality', 'Double quoted']);
  assert.ok(records.every((r) => r.field.startsWith('arg')));
  assert.equal(risks.length, 0);
});

test('registry-scan: call args skip dynamic', () => {
  const { records, risks } = scanCalls(`tab("x", "Part " + middle + " end", []);
sec("y", \`by \${who}\`, []);`, [{ name: 'tab', args: [1] }, { name: 'sec', args: [1] }]);
  assert.equal(records.length, 0);
  assert.equal(risks.length, 2);
  assert.ok(risks.every((r) => r.kind === 'dynamic-value'));
});
