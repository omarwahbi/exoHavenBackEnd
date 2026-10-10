'use strict';

const { getSearch } = require('../../../search');

// Query parameters: q, category, sub_category (documentIds), instock=1,
// sort (relevance | featured | newest | price_asc | price_desc | name), page,
// pageSize (max 48), suggest=1 (also return matching categories).
module.exports = ({ strapi }) => ({
  async find(ctx) {
    ctx.body = await getSearch(strapi).search(ctx.query);
  },
});
