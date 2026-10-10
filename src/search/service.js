'use strict';

const { createClient, INDEX, SETTINGS } = require('./meili');
const { normalize } = require('./normalize');
const { toSearchDocument, CARD_FIELDS, ITEM_POPULATE } = require('./document');

const ITEM = 'api::item.item';
const CATEGORY = 'api::category.category';
const SUB_CATEGORY = 'api::sub-category.sub-category';

const pick = (doc, fields) => Object.fromEntries(fields.map((f) => [f, doc[f] ?? null]));

// Sort orders the shop offers. "featured" (the default without a search) puts new
// arrivals first; every order puts items in stock before those that aren't.
const MEILI_SORT = {
  relevance: ['in_stock_rank:desc'],
  featured: ['in_stock_rank:desc', 'new_rank:desc', 'created_at:desc'],
  newest: ['in_stock_rank:desc', 'created_at:desc'],
  price_asc: ['in_stock_rank:desc', 'price_min:asc'],
  price_desc: ['in_stock_rank:desc', 'price_min:desc'],
  name: ['in_stock_rank:desc', 'name:asc'],
};
// The database can't sort by variant prices or by stock across variants (and its
// stock / new-arrival switches can be empty), so its orders are simpler.
const DB_SORT = {
  relevance: ['createdAt:desc'],
  featured: ['createdAt:desc'],
  newest: ['createdAt:desc'],
  price_asc: ['state:asc'],
  price_desc: ['state:desc'],
  name: ['name:asc'],
};
const SORTS = Object.keys(MEILI_SORT);

const ID = /^[a-z0-9]{1,64}$/;
const MAX_PAGE_SIZE = 48;

// Query string -> search options, with anything invalid dropped or clamped.
const parseQuery = (query = {}) => {
  const q = String(query.q ?? '').trim().slice(0, 100);
  const int = (value, fallback, max) => {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) && n >= 1 ? Math.min(n, max) : fallback;
  };
  const id = (value) => (typeof value === 'string' && ID.test(value) ? value : null);
  const sort = SORTS.includes(query.sort) ? query.sort : q ? 'relevance' : 'featured';
  return {
    q,
    category: id(query.category),
    subCategory: id(query.sub_category),
    inStock: query.instock === '1' || query.instock === 'true',
    sort,
    page: int(query.page, 1, 1000),
    pageSize: int(query.pageSize, 12, MAX_PAGE_SIZE),
    suggest: query.suggest === '1' || query.suggest === 'true',
  };
};

const createSearch = (strapi, env = process.env) => {
  const log = strapi.log;
  const meili = env.MEILISEARCH_URL ? createClient({ url: env.MEILISEARCH_URL, key: env.MEILISEARCH_KEY }) : null;

  // ---- Index upkeep -------------------------------------------------------

  const publishedItems = async function* () {
    for (let start = 0; ; start += 200) {
      const items = await strapi.documents(ITEM).findMany({
        status: 'published',
        populate: ITEM_POPULATE,
        sort: 'id:asc',
        start,
        limit: 200,
      });
      yield* items;
      if (items.length < 200) return;
    }
  };

  const setup = async () => {
    // Both are queued tasks: creating an index that exists fails quietly in the queue.
    await meili.call('POST', '/indexes', { uid: INDEX, primaryKey: 'id' });
    await meili.call('PATCH', meili.index('/settings'), SETTINGS);
  };

  // Puts every published item in the index and removes what is no longer published.
  const reindexAll = async () => {
    const docs = [];
    for await (const item of publishedItems()) docs.push(toSearchDocument(item));
    for (let i = 0; i < docs.length; i += 500) {
      await meili.call('POST', meili.index('/documents'), docs.slice(i, i + 500));
    }
    const keep = new Set(docs.map((d) => d.id));
    const stale = [];
    for (let offset = 0; ; offset += 1000) {
      const page = await meili
        .call('GET', meili.index(`/documents?fields=id&limit=1000&offset=${offset}`))
        // A brand-new index may not exist yet (its creation is still queued).
        .catch((error) => (error.status === 404 ? { results: [] } : Promise.reject(error)));
      stale.push(...page.results.map((d) => d.id).filter((id) => !keep.has(id)));
      if (page.results.length < 1000) break;
    }
    if (stale.length) await meili.call('POST', meili.index('/documents/delete-batch'), stale);
    log.info(`Search: indexed ${docs.length} items, removed ${stale.length}.`);
  };

  // Writes are collected for a moment, then the index catches up in the background,
  // one update at a time: a failure never blocks or fails the admin's save. If
  // Meilisearch can't be reached, the whole index is rebuilt once it answers again.
  const pendingItems = new Set();
  let pendingAll = false;
  let timer = null;
  let running = false;

  const schedule = (delay = 1000) => {
    if (!timer && !running) timer = setTimeout(flush, delay);
  };

  const flush = async () => {
    timer = null;
    running = true;
    const all = pendingAll;
    const ids = [...pendingItems];
    pendingAll = false;
    pendingItems.clear();
    let failed = false;
    try {
      if (all) {
        await setup();
        await reindexAll();
      } else {
        for (const documentId of ids) {
          const item = await strapi.documents(ITEM).findOne({ documentId, status: 'published', populate: ITEM_POPULATE });
          if (item) await meili.call('POST', meili.index('/documents'), [toSearchDocument(item)]);
          else await meili.call('DELETE', meili.index(`/documents/${encodeURIComponent(documentId)}`));
        }
      }
    } catch (error) {
      failed = true;
      pendingAll = true;
      log.warn(`Search: could not update the index (${error.message}); rebuilding it in a minute.`);
    } finally {
      running = false;
    }
    if (failed) schedule(60_000);
    else if (pendingAll || pendingItems.size) schedule();
  };

  const ITEM_ACTIONS = ['create', 'update', 'delete', 'publish', 'unpublish', 'discardDraft', 'clone'];
  const RENAME_ACTIONS = ['update', 'delete', 'publish', 'unpublish'];

  // Document service middleware (registered in src/index.js).
  const middleware = async (ctx, next) => {
    const result = await next();
    if (!meili) return result;
    if (ctx.uid === ITEM && ITEM_ACTIONS.includes(ctx.action)) {
      const id = ctx.params?.documentId ?? result?.documentId ?? result?.entries?.[0]?.documentId;
      if (id) {
        pendingItems.add(id);
        schedule();
      }
    } else if ((ctx.uid === CATEGORY || ctx.uid === SUB_CATEGORY) && RENAME_ACTIONS.includes(ctx.action)) {
      // Items carry their category names: rebuild everything (a few hundred items).
      pendingAll = true;
      schedule();
    }
    return result;
  };

  // On startup: create or update the index, then rebuild it, in the background
  // (retried every minute while Meilisearch can't be reached).
  const start = () => {
    if (!meili) {
      log.info('Search: MEILISEARCH_URL is not set, searching the database instead.');
      return;
    }
    pendingAll = true;
    schedule(0);
  };

  // ---- Searching ------------------------------------------------------------

  const searchMeili = async (o) => {
    const filter = [];
    if (o.category) filter.push(`category_id = "${o.category}"`);
    if (o.subCategory) filter.push(`sub_category_id = "${o.subCategory}"`);
    if (o.inStock) filter.push('in_stock = true');
    const run = (matchingStrategy) =>
      meili.call('POST', meili.index('/search'), {
        q: normalize(o.q),
        filter,
        sort: MEILI_SORT[o.sort],
        page: o.page,
        hitsPerPage: o.pageSize,
        attributesToRetrieve: CARD_FIELDS,
        matchingStrategy,
      });
    // Items matching every word typed; if there are none, those matching the most.
    let res = await run('all');
    if (res.totalHits === 0 && normalize(o.q).includes(' ')) res = await run('last');
    return { items: res.hits, total: res.totalHits, pageCount: res.totalPages };
  };

  const searchDatabase = async (o) => {
    const filters = {};
    if (o.q) {
      filters.$or = [{ name: { $containsi: o.q } }, { Item_ID: { $containsi: o.q } }, { description: { $containsi: o.q } }];
    }
    if (o.category) filters.category = { documentId: { $eq: o.category } };
    if (o.subCategory) filters.sub_category = { documentId: { $eq: o.subCategory } };
    // Never switched on (empty) counts as in stock.
    if (o.inStock) filters.out_of_stock = { $ne: true };
    const docs = strapi.documents(ITEM);
    const [items, total] = await Promise.all([
      docs.findMany({
        status: 'published',
        filters,
        sort: DB_SORT[o.sort],
        populate: ITEM_POPULATE,
        start: (o.page - 1) * o.pageSize,
        limit: o.pageSize,
      }),
      docs.count({ status: 'published', filters }),
    ]);
    return {
      items: items.map((item) => pick(toSearchDocument(item), CARD_FIELDS)),
      total,
      pageCount: Math.ceil(total / o.pageSize),
    };
  };

  // Categories and sub-categories whose name matches, for the search suggestions.
  let namesCache = { at: 0, list: [] };
  const matchingCategories = async (q) => {
    const wanted = normalize(q);
    if (!wanted) return [];
    if (Date.now() - namesCache.at > 60_000) {
      const [categories, subs] = await Promise.all([
        strapi.documents(CATEGORY).findMany({ status: 'published', fields: ['name'], limit: 500 }),
        strapi.documents(SUB_CATEGORY).findMany({
          status: 'published',
          fields: ['name'],
          populate: { category: { fields: ['name'] } },
          limit: 1000,
        }),
      ]);
      namesCache = {
        at: Date.now(),
        list: [
          ...categories.map((c) => ({ type: 'category', documentId: c.documentId, name: c.name, parent: null })),
          ...subs.map((s) => ({ type: 'sub_category', documentId: s.documentId, name: s.name, parent: s.category?.name ?? null })),
        ].map((entry) => ({ ...entry, key: normalize(entry.name) })),
      };
    }
    return namesCache.list
      .filter((entry) => entry.key.includes(wanted))
      .slice(0, 4)
      .map(({ key, ...entry }) => entry);
  };

  // After a failed search, the database answers for a while instead of every
  // request waiting on (and logging) Meilisearch again.
  let meiliDownUntil = 0;

  const search = async (query) => {
    const o = parseQuery(query);
    let engine = 'database';
    let result;
    if (meili && Date.now() >= meiliDownUntil) {
      try {
        result = await searchMeili(o);
        engine = 'meilisearch';
      } catch (error) {
        meiliDownUntil = Date.now() + 30_000;
        log.warn(`Search: Meilisearch failed (${error.message}), using the database for 30 seconds.`);
      }
    }
    if (!result) result = await searchDatabase(o);
    return {
      data: result.items,
      meta: {
        pagination: { page: o.page, pageSize: o.pageSize, pageCount: result.pageCount, total: result.total },
        sort: o.sort,
        engine,
        ...(o.suggest && { categories: await matchingCategories(o.q) }),
      },
    };
  };

  return { middleware, start, search, reindexAll, enabled: Boolean(meili) };
};

module.exports = { createSearch, parseQuery };
