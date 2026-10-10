'use strict';

/**
 * sub-category controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { legacyIdController } = require('../../../utils/legacy-id');

module.exports = createCoreController('api::sub-category.sub-category', legacyIdController('api::sub-category.sub-category'));
