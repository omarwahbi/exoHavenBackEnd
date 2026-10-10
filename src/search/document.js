'use strict';

const { normalize } = require('./normalize');

// What the search index holds for one published item: what a product card shows
// (in the same shape as the API's items, so the shop renders search results with
// its usual card), plus normalized text to search and fields to filter and sort by.
//
// Stock and price follow the shop's rules (frontend src/utils/product.js): an item
// with variants is out of stock when every variant is, and costs from its cheapest
// variant in stock.

const variantsOf = (item) => (Array.isArray(item?.variants) ? item.variants : []);
const toPrice = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const priceRange = (item) => {
  const variants = variantsOf(item);
  if (variants.length === 0) {
    const price = toPrice(item.state);
    return [price, price];
  }
  const available = variants.filter((v) => !v.out_of_stock);
  const prices = (available.length ? available : variants).map((v) => toPrice(v.price)).filter((p) => p !== null);
  return prices.length ? [Math.min(...prices), Math.max(...prices)] : [null, null];
};

const media = (file) => (file?.url ? { url: file.url, width: file.width ?? null, height: file.height ?? null } : null);
const firstImage = (images) => (Array.isArray(images) ? images[0] : images);

const toSearchDocument = (item) => {
  const variants = variantsOf(item);
  const outOfStock = Boolean(item.out_of_stock) || (variants.length > 0 && variants.every((v) => v.out_of_stock));
  const [priceMin, priceMax] = priceRange(item);
  const thumbnail = media(item.item_thumbnail);
  const image = media(firstImage(item.item_images));

  return {
    id: item.documentId,

    // The card
    documentId: item.documentId,
    name: item.name ?? '',
    state: item.state ?? null,
    new_arrival: Boolean(item.new_arrival),
    out_of_stock: Boolean(item.out_of_stock),
    low_stock: Boolean(item.low_stock),
    Item_ID: item.Item_ID ?? null,
    item_thumbnail: thumbnail,
    item_images: image ? [image] : [],
    variants: variants.map((v) => ({
      label: v.label,
      price: toPrice(v.price),
      sku: v.sku ?? null,
      out_of_stock: Boolean(v.out_of_stock),
      low_stock: Boolean(v.low_stock),
    })),
    category: item.category ? { documentId: item.category.documentId, name: item.category.name } : null,
    sub_category: item.sub_category ? { documentId: item.sub_category.documentId, name: item.sub_category.name } : null,

    // Searched (normalized, see normalize.js)
    name_n: normalize(item.name),
    variants_n: normalize(variants.map((v) => v.label).join(' ')),
    category_n: normalize([item.sub_category?.name, item.category?.name].filter(Boolean).join(' ')),
    codes: [item.Item_ID, ...variants.map((v) => v.sku)].filter(Boolean).join(' '),
    description_n: normalize(item.description),

    // Filtered and sorted
    category_id: item.category?.documentId ?? null,
    sub_category_id: item.sub_category?.documentId ?? null,
    in_stock: !outOfStock,
    // Numbers, for sorting: in stock first, then new arrivals.
    in_stock_rank: outOfStock ? 0 : 1,
    new_rank: item.new_arrival ? 1 : 0,
    price_min: priceMin,
    price_max: priceMax,
    created_at: item.createdAt ? Date.parse(item.createdAt) : 0,
  };
};

// The card fields of a search document, i.e. what the shop receives.
const CARD_FIELDS = [
  'documentId', 'name', 'state', 'new_arrival', 'out_of_stock', 'low_stock', 'Item_ID',
  'item_thumbnail', 'item_images', 'variants', 'category', 'sub_category',
];

// What to read from the database to build documents.
const ITEM_POPULATE = {
  item_thumbnail: { fields: ['url', 'width', 'height'] },
  item_images: { fields: ['url', 'width', 'height'] },
  variants: true,
  category: { fields: ['documentId', 'name'] },
  sub_category: { fields: ['documentId', 'name'] },
};

module.exports = { toSearchDocument, CARD_FIELDS, ITEM_POPULATE, priceRange };
