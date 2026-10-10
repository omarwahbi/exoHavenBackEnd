'use strict';

const { protectLegacyIds } = require('./utils/legacy-id');
const { syncItemCategories } = require('./utils/item-categories');
const bootstrap = require('./utils/bootstrap');

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {
    strapi.customFields.register({ name: 'category-picker', type: 'json' });
    protectLegacyIds(strapi);
    syncItemCategories(strapi);
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap,
};
