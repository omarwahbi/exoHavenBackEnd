'use strict';

/**
 * category controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { legacyIdController } = require('../../../utils/legacy-id');

module.exports = createCoreController('api::category.category', legacyIdController('api::category.category'));
