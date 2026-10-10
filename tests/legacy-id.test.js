'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveDocumentId, protectLegacyIds } = require('../src/utils/legacy-id');

const fakeStrapi = (rows) => ({
  db: {
    query: () => ({
      findOne: async ({ where }) =>
        rows.find((row) => Object.entries(where).every(([key, value]) => row[key] === value)) ?? null,
    }),
  },
});

test('a numeric id resolves through legacy_id first, then the row id', async () => {
  const strapi = fakeStrapi([
    { id: 40, legacy_id: 5, documentId: 'old5' },
    { id: 5, legacy_id: null, documentId: 'row5' },
    { id: 41, legacy_id: null, documentId: 'new41' },
  ]);
  assert.equal(await resolveDocumentId(strapi, 'api::item.item', '5'), 'old5');
  assert.equal(await resolveDocumentId(strapi, 'api::item.item', '41'), 'new41');
});

test('documentIds, unknown and out-of-range ids are returned unchanged', async () => {
  const strapi = fakeStrapi([]);
  assert.equal(await resolveDocumentId(strapi, 'api::item.item', 'abc123'), 'abc123');
  assert.equal(await resolveDocumentId(strapi, 'api::item.item', '999'), '999');
  assert.equal(await resolveDocumentId(strapi, 'api::item.item', '99999999999'), '99999999999');
});

test('legacy_id cannot be set on create or changed on update', async () => {
  let middleware;
  protectLegacyIds({ documents: { use: (fn) => (middleware = fn) } });
  const created = { data: { name: 'x', legacy_id: 3 } };
  await middleware({ uid: 'api::item.item', action: 'create', params: created }, async () => {});
  assert.equal(created.data.legacy_id, null);
  const updated = { data: { name: 'y', legacy_id: 3 } };
  await middleware({ uid: 'api::item.item', action: 'update', params: updated }, async () => {});
  assert.equal('legacy_id' in updated.data, false);
});
