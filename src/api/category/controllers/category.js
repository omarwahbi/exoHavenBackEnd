'use strict';

/**
 * category controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { resolveDocumentId } = require('../../../utils/legacy-id');

module.exports = createCoreController('api::category.category', ({ strapi }) => ({
  // Also accept the numeric v4 id in /api/categories/:id (see src/utils/legacy-id.js).
  async findOne(ctx) {
    ctx.params.id = await resolveDocumentId(strapi, 'api::category.category', ctx.params.id);
    return super.findOne(ctx);
  },
}));
