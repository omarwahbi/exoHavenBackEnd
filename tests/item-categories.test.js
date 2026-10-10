'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { syncItemCategories } = require('../src/utils/item-categories');

const ITEM = 'api::item.item';
const SUB = 'api::sub-category.sub-category';

// Two categories, each with one sub-category.
const SUB_CATEGORIES = {
  subA: { name: 'Sub A', category: { documentId: 'catA' } },
  subB: { name: 'Sub B', category: { documentId: 'catB' } },
};

// A fake strapi with just what item-categories.js uses. `drafts` are the items'
// current draft versions; `pickerWrites` records direct picker updates.
const fakeStrapi = (drafts = {}) => {
  let middleware;
  const pickerWrites = [];
  const strapi = {
    documents: Object.assign(
      (uid) => ({
        findOne: async ({ documentId }) => (uid === SUB ? SUB_CATEGORIES[documentId] : drafts[documentId]) ?? null,
      }),
      { use: (fn) => (middleware = fn) }
    ),
    db: { query: () => ({ update: async ({ data }) => pickerWrites.push(data.category_picker) }) },
  };
  syncItemCategories(strapi);
  // Runs the middleware like the document service does; returns what reached it.
  const run = async (action, params, result = { documentId: 'item1' }) => {
    let passed;
    await middleware({ uid: ITEM, action, params }, async () => {
      passed = params;
      return result;
    });
    return passed;
  };
  return { run, pickerWrites };
};

test('a matching picker sets both relations', async () => {
  const { run } = fakeStrapi();
  const params = { data: { name: 'x', category_picker: { category: 'catA', sub_category: 'subA' } } };
  await run('update', params);
  assert.equal(params.data.category, 'catA');
  assert.equal(params.data.sub_category, 'subA');
});

test('a sub-category from another category is rejected', async () => {
  const { run } = fakeStrapi();
  await assert.rejects(
    run('update', { data: { category_picker: { category: 'catA', sub_category: 'subB' } } }),
    /does not belong to the selected category/
  );
});

test('a sub-category without a category is rejected', async () => {
  const { run } = fakeStrapi();
  await assert.rejects(run('create', { data: { category_picker: { sub_category: 'subA' } } }), /Choose a category/);
});

test('a draft may have a category only', async () => {
  const { run } = fakeStrapi();
  const params = { data: { category_picker: { category: 'catA' } } };
  await run('create', params);
  assert.equal(params.data.category, 'catA');
  assert.equal(params.data.sub_category, null);
});

test('duplicating an item applies the picker of the duplicate form', async () => {
  const { run } = fakeStrapi();
  const params = { data: { category_picker: { category: 'catB', sub_category: 'subB' } } };
  await run('clone', params);
  assert.equal(params.data.category, 'catB');
});

test('relations set without the picker (API, MCP) are copied into the picker', async () => {
  const draft = { id: 7, category: { documentId: 'catB' }, sub_category: { documentId: 'subB' } };
  const { run, pickerWrites } = fakeStrapi({ item1: draft });
  await run('update', { data: { category: 'catB', sub_category: 'subB' } });
  assert.deepEqual(pickerWrites, [{ category: 'catB', sub_category: 'subB' }]);
});

test('saving other fields leaves the picker alone', async () => {
  const { run, pickerWrites } = fakeStrapi();
  await run('update', { data: { name: 'renamed' } });
  assert.deepEqual(pickerWrites, []);
});

const complete = { item_thumbnail: { id: 1 }, category: { documentId: 'catA' }, sub_category: { documentId: 'subA' } };

test('publishing a complete item passes', async () => {
  const { run } = fakeStrapi({ item1: complete });
  assert.ok(await run('publish', { documentId: 'item1' }));
});

test('publishing without a thumbnail is rejected', async () => {
  const { run } = fakeStrapi({ item1: { ...complete, item_thumbnail: null } });
  await assert.rejects(run('publish', { documentId: 'item1' }), /thumbnail/);
});

test('publishing without a sub-category is rejected', async () => {
  const { run } = fakeStrapi({ item1: { ...complete, sub_category: null } });
  await assert.rejects(run('publish', { documentId: 'item1' }), /sub-category before publishing/);
});

test('publishing a mismatched pair is rejected', async () => {
  const { run } = fakeStrapi({ item1: { ...complete, sub_category: { documentId: 'subB' } } });
  await assert.rejects(run('publish', { documentId: 'item1' }), /does not belong/);
});

test('other content types pass straight through', async () => {
  let middleware;
  syncItemCategories({ documents: { use: (fn) => (middleware = fn) } });
  const params = { data: { category_picker: { sub_category: 'subB' } } };
  let reached = false;
  await middleware({ uid: 'api::category.category', action: 'update', params }, async () => (reached = true));
  assert.ok(reached);
});

test('two variants with the same label are rejected', async () => {
  const { run } = fakeStrapi();
  await assert.rejects(
    run('update', { data: { variants: [{ label: '50W', price: 1 }, { label: ' 50w ', price: 2 }] } }),
    /labelled "50w"/
  );
});

test('a variant without a label is rejected', async () => {
  const { run } = fakeStrapi();
  await assert.rejects(run('create', { data: { variants: [{ label: '  ', price: 1 }] } }), /needs a label/);
});

test('publishing checks the variant labels too', async () => {
  const draft = { ...complete, variants: [{ label: 'S' }, { label: 'S' }] };
  const { run } = fakeStrapi({ item1: draft });
  await assert.rejects(run('publish', { documentId: 'item1' }), /labelled "S"/);
});

test('distinct variant labels pass', async () => {
  const { run } = fakeStrapi();
  assert.ok(await run('update', { data: { variants: [{ label: '50W', price: 1 }, { label: '100W', price: 2 }] } }));
});
