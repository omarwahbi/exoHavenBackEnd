'use strict';

// Item switches never touched in the admin are empty (NULL) in the database, not
// "off". The database sorts empty values first, so with "new arrivals first"
// (new_arrival DESC) untouched items came before the real new arrivals on the
// products page and the home page. Empty means off: set them so. The schema now
// defaults these switches to false, so new items start off.
const SWITCHES = ['new_arrival', 'out_of_stock', 'low_stock'];

module.exports = {
  async up(knex) {
    if (!(await knex.schema.hasTable('items'))) return; // empty database
    for (const column of SWITCHES) {
      // A column that doesn't exist yet is added by Strapi's schema sync, already
      // with its default.
      if (await knex.schema.hasColumn('items', column)) {
        await knex('items').whereNull(column).update({ [column]: false });
      }
    }
  },
};
