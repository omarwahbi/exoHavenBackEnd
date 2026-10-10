'use strict';

const { createSearch } = require('./service');

// One search service per Strapi instance: its document middleware, startup
// indexing and the /api/search controller share it.
let instance = null;
const getSearch = (strapi) => {
  if (!instance) instance = createSearch(strapi);
  return instance;
};

module.exports = { getSearch };
