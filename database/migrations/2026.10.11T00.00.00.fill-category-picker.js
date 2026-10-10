'use strict';

// Fills items.category_picker (see src/utils/item-categories.js) from each item's
// current category and sub-category, so the admin's picker shows them for items
// created before it existed. Runs before Strapi's schema sync, so it adds the
// column itself.
module.exports = {
  async up(knex) {
    if (!(await knex.schema.hasTable('items'))) return; // empty database
    if (!(await knex.schema.hasColumn('items', 'category_picker'))) {
      await knex.schema.alterTable('items', (t) => t.jsonb('category_picker'));
    }
    // A Strapi 4 database (restored from an old backup) has no _lnk tables yet; its
    // items get an empty picker.
    if (!(await knex.schema.hasTable('items_category_lnk'))) return;
    await knex.raw(`
      UPDATE items i SET category_picker = jsonb_build_object(
        'category', (SELECT c.document_id FROM items_category_lnk l
                       JOIN categories c ON c.id = l.category_id WHERE l.item_id = i.id LIMIT 1),
        'sub_category', (SELECT s.document_id FROM items_sub_category_lnk l
                           JOIN sub_categories s ON s.id = l.sub_category_id WHERE l.item_id = i.id LIMIT 1)
      )
      WHERE i.category_picker IS NULL
    `);
  },
};
