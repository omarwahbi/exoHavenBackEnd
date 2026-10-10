'use strict';

/**
 * item controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { legacyIdController } = require('../../../utils/legacy-id');

module.exports = createCoreController('api::item.item', legacyIdController('api::item.item'));
