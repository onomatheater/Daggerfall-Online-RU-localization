import test from 'node:test';
import assert from 'node:assert/strict';
import { parseShared, parseTable, joinTable } from '../tools/dfu-asset.mjs';

const SHARED = `  m_Entries:
  - m_Id: 240214473175040
    m_Key: 1
    m_Metadata:
      m_Items: []
  - m_Id: 240214473175041
    m_Key: 2
    m_Metadata:
      m_Items: []
`;
const TABLE = `  m_TableData:
  - m_Id: 240214473175040
    m_Localized: Emerald
    m_Metadata:
      m_Items: []
  - m_Id: 240214473175041
    m_Localized: Sapphire
    m_Metadata:
      m_Items: []
`;

test('shared maps id->key, table maps id->value, join gives key->en', () => {
  assert.deepEqual(parseShared(SHARED), { 240214473175040: '1', 240214473175041: '2' });
  assert.deepEqual(parseTable(TABLE), { 240214473175040: 'Emerald', 240214473175041: 'Sapphire' });
  assert.deepEqual(joinTable(parseShared(SHARED), parseTable(TABLE)), { 1: 'Emerald', 2: 'Sapphire' });
});

test('multiline localized values joined', () => {
  const t = parseTable('  m_TableData:\n  - m_Id: 5\n    m_Localized: line1\n      line2\n    m_Metadata:\n');
  assert.equal(t[5], 'line1 line2');
});
