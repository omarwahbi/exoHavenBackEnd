'use strict';

/**
 * sub-category controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { resolveDocumentId } = require('../../../utils/legacy-id');

module.exports = createCoreController('api::sub-category.sub-category', ({ strapi }) => ({
  // Also accept the numeric v4 id in /api/sub-categories/:id (see src/utils/legacy-id.js).
  async findOne(ctx) {
    ctx.params.id = await resolveDocumentId(strapi, 'api::sub-category.sub-category', ctx.params.id);
    return super.findOne(ctx);
  },
}));
