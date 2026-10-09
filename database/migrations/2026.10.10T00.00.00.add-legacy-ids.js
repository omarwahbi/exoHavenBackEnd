'use strict';

// Keeps each entry's Strapi v4 id in legacy_id (see src/utils/legacy-id.js).
//
// Project migrations run before Strapi's own v4 -> v5 migrations, so this sees the
// v4 tables: one row per entry, still carrying its original id. Strapi's v5
// migration then copies legacy_id into the draft rows it creates. The column must
// exist before that copy runs, which is why it is added here and not left to the
// schema sync that happens afterwards.
const TABLES = ['items', 'categories', 'sub_categories'];

module.exports = {
  async up(knex) {
    for (const table of TABLES) {
      // Empty database: Strapi creates the table, with legacy_id, after this.
      if (!(await knex.schema.hasTable(table))) continue;
      if (!(await knex.schema.hasColumn(table, 'legacy_id'))) {
        await knex.schema.alterTable(table, (t) => t.integer('legacy_id'));
      }
      await knex(table).whereNull('legacy_id').update({ legacy_id: knex.ref('id') });
    }
  },
};
