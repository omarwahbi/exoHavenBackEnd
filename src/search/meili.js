'use strict';

const { normalize } = require('./normalize');

// A small Meilisearch client (its HTTP API, through fetch) and the index settings.
// Meilisearch runs next to Strapi (see deploy/docker-compose.yml); Strapi reaches it
// with MEILISEARCH_URL and MEILISEARCH_KEY. Without them, search uses the database.

const INDEX = 'items';

const createClient = ({ url, key, timeout = 5000 }) => {
  const call = async (method, path, body) => {
    const res = await fetch(`${url.replace(/\/$/, '')}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(key && { Authorization: `Bearer ${key}` }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const error = new Error(`Meilisearch ${method} ${path}: ${res.status} ${text.slice(0, 300)}`);
      error.status = res.status;
      throw error;
    }
    return res.status === 204 ? null : res.json();
  };
  return { call, index: (path = '') => `/indexes/${INDEX}${path}` };
};

// Words that mean the same thing to a shopper, written as normalize() writes them.
// Each word of a group finds the others.
const SYNONYM_GROUPS = [
  ['اضاءه', 'ضوء', 'لمبه', 'مصباح', 'اناره', 'light', 'lamp', 'bulb'],
  ['سخان', 'تدفئه', 'حراره', 'دفايه', 'heater', 'heat'],
  ['طعام', 'اكل', 'غذاء', 'food'],
  ['سلحفاه', 'سلاحف', 'turtle', 'tortoise'],
  ['ثعبان', 'ثعابين', 'افعى', 'حيه', 'snake'],
  ['سحليه', 'سحالي', 'lizard'],
  ['حوض', 'تيراريوم', 'terrarium'],
  ['قفص', 'اقفاص', 'cage'],
  ['طير', 'طيور', 'bird'],
  ['زاحف', 'زواحف', 'reptile'],
];

const synonyms = (groups = SYNONYM_GROUPS) => {
  const out = {};
  for (const group of groups) {
    const words = group.map(normalize);
    for (const word of words) out[word] = words.filter((w) => w !== word);
  }
  return out;
};

const SETTINGS = {
  // The chosen order comes first, so "cheapest first" is strictly by price; the
  // default order ("relevance") only puts items in stock first.
  rankingRules: ['sort', 'words', 'typo', 'proximity', 'attribute', 'exactness'],
  // Earlier attributes rank higher: a match in the name beats one in the description.
  searchableAttributes: ['name_n', 'variants_n', 'codes', 'category_n', 'description_n'],
  filterableAttributes: ['category_id', 'sub_category_id', 'in_stock', 'new_arrival'],
  sortableAttributes: ['price_min', 'created_at', 'name', 'in_stock_rank', 'new_rank'],
  synonyms: synonyms(),
  // Codes and SKUs must match as typed: "T-90000" is not a typo of "T-15000".
  typoTolerance: { minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 }, disableOnAttributes: ['codes'] },
  pagination: { maxTotalHits: 5000 },
};

module.exports = { createClient, INDEX, SETTINGS, SYNONYM_GROUPS, synonyms };
