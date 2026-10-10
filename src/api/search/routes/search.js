'use strict';

// GET /api/search: the shop's product search and listings (src/search/). Public.
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/search',
      handler: 'search.find',
      config: { auth: false },
    },
  ],
};
