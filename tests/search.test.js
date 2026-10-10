'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { normalize } = require('../src/search/normalize');
const { toSearchDocument, CARD_FIELDS } = require('../src/search/document');
const { synonyms } = require('../src/search/meili');
const { parseQuery } = require('../src/search/service');

test('normalize: spelling variants of the same Arabic word match', () => {
  assert.equal(normalize('الإضاءة'), normalize('اضاءه'));
  assert.equal(normalize('إضاءة'), 'اضاءه');
  assert.equal(normalize('سلحفاة'), normalize('سلحفاه'));
  assert.equal(normalize('مُصْبَاح'), 'مصباح');
  assert.equal(normalize('مستلزمات'), 'مستلزمات');
});

test('normalize: the article is removed, with or without a hamza typed', () => {
  assert.equal(normalize('للزواحف'), 'زواحف');
  assert.equal(normalize('والطعام'), 'طعام');
  assert.equal(normalize('ألعاب'), normalize('العاب'));
  assert.equal(normalize('ألماني'), normalize('الماني'));
  // Too short to carry an article
  assert.equal(normalize('الة'), 'اله');
});

test('normalize: digits, Latin text and punctuation', () => {
  assert.equal(normalize('مصباح UVB-١٠٠ واط'), 'مصباح uvb 100 واط');
  assert.equal(normalize('  '), '');
  assert.equal(normalize(null), '');
});

test('synonyms: every word of a group finds the others', () => {
  const s = synonyms([['إضاءة', 'ضوء', 'lamp']]);
  assert.deepEqual(s['اضاءه'], ['ضوء', 'lamp']);
  assert.deepEqual(s.lamp, ['اضاءه', 'ضوء']);
});

const item = (over = {}) => ({
  documentId: 'abc',
  name: 'مصباح حراري',
  state: '15000',
  description: 'وصف',
  createdAt: '2026-01-02T00:00:00.000Z',
  item_thumbnail: { url: 'https://img/x.jpg', width: 10, height: 10 },
  item_images: [{ url: 'https://img/y.jpg' }],
  category: { documentId: 'cat', name: 'زواحف' },
  sub_category: { documentId: 'sub', name: 'إضاءة' },
  variants: [],
  ...over,
});

test('search document: price and stock of an item without variants', () => {
  const doc = toSearchDocument(item());
  assert.equal(doc.id, 'abc');
  assert.equal(doc.price_min, 15000);
  assert.equal(doc.in_stock, true);
  assert.equal(doc.in_stock_rank, 1);
  assert.equal(doc.category_id, 'cat');
  assert.equal(doc.category_n, 'اضاءه زواحف');
  assert.equal(doc.created_at, Date.parse('2026-01-02T00:00:00.000Z'));
  for (const field of CARD_FIELDS) assert.ok(field in doc, field);
});

test('search document: variants set the price range from those in stock', () => {
  const doc = toSearchDocument(
    item({
      variants: [
        { label: '50W', price: 15000, out_of_stock: true },
        { label: '100W', price: 22000, sku: 'L-100' },
        { label: '150W', price: 30000 },
      ],
    })
  );
  assert.deepEqual([doc.price_min, doc.price_max], [22000, 30000]);
  assert.equal(doc.variants_n, '50w 100w 150w');
  assert.equal(doc.codes, 'L-100');
  assert.equal(doc.in_stock, true);
});

test('search document: out of stock when every variant is', () => {
  const doc = toSearchDocument(item({ variants: [{ label: 'A', price: 1, out_of_stock: true }] }));
  assert.equal(doc.in_stock, false);
  assert.equal(doc.in_stock_rank, 0);
  assert.equal(doc.price_min, 1);
});

test('search document: missing optional fields', () => {
  const doc = toSearchDocument({ documentId: 'x', name: 'n', state: 'abc' });
  assert.equal(doc.price_min, null);
  assert.equal(doc.item_thumbnail, null);
  assert.deepEqual(doc.item_images, []);
  assert.equal(doc.category, null);
});

test('parseQuery: defaults, clamping and rejected values', () => {
  assert.deepEqual(parseQuery({}), {
    q: '', category: null, subCategory: null, inStock: false, sort: 'featured', page: 1, pageSize: 12, suggest: false,
  });
  const o = parseQuery({ q: ' حوض ', pageSize: '500', page: '-3', sort: 'bogus', category: 'x" OR 1=1', instock: '1' });
  assert.equal(o.q, 'حوض');
  assert.equal(o.sort, 'relevance');
  assert.equal(o.pageSize, 48);
  assert.equal(o.page, 1);
  assert.equal(o.category, null);
  assert.equal(o.inStock, true);
  assert.equal(parseQuery({ sort: 'price_asc', sub_category: 'abc123' }).subCategory, 'abc123');
});
