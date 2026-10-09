'use strict';

/**
 * item controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { resolveDocumentId } = require('../../../utils/legacy-id');

module.exports = createCoreController('api::item.item', ({ strapi }) => ({
  // Also accept the numeric v4 id in /api/items/:id (see src/utils/legacy-id.js).
  async findOne(ctx) {
    ctx.params.id = await resolveDocumentId(strapi, 'api::item.item', ctx.params.id);
    return super.findOne(ctx);
  },
}));
