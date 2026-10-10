'use strict';

const { errors } = require('@strapi/utils');

// An item belongs to a category and to one of that category's sub-categories.
//
// In the admin both are picked with the category_picker custom field
// (src/admin/components/CategoryPicker.jsx): the sub-category list is disabled until
// a category is chosen and then only offers that category's sub-categories. The
// picker stores { category, sub_category } (documentIds); this file copies that into
// the real `category` and `sub_category` relations, which the API and the frontend
// use, and refuses combinations that don't match.

const ITEM = 'api::item.item';
const SUB_CATEGORY = 'api::sub-category.sub-category';

const fail = (message) => {
  throw new errors.ValidationError(message);
};

// The category a sub-category belongs to (its draft, which is what the admin edits).
const parentCategoryOf = async (strapi, subCategoryId) => {
  const sub = await strapi.documents(SUB_CATEGORY).findOne({
    documentId: subCategoryId,
    fields: ['name'],
    populate: { category: { fields: ['documentId'] } },
  });
  if (!sub) fail('The selected sub-category no longer exists.');
  return { name: sub.name, categoryId: sub.category?.documentId ?? null };
};

const checkPair = async (strapi, categoryId, subCategoryId) => {
  if (!subCategoryId) return;
  if (!categoryId) fail('Choose a category before the sub-category.');
  const sub = await parentCategoryOf(strapi, subCategoryId);
  if (sub.categoryId !== categoryId) {
    fail(`The sub-category "${sub.name}" does not belong to the selected category.`);
  }
};

const syncItemCategories = (strapi) => {
  strapi.documents.use(async (ctx, next) => {
    if (ctx.uid !== ITEM) return next();

    if ((ctx.action === 'create' || ctx.action === 'update') && ctx.params?.data?.category_picker !== undefined) {
      const picker = ctx.params.data.category_picker || {};
      const category = picker.category || null;
      const subCategory = picker.sub_category || null;
      await checkPair(strapi, category, subCategory);
      ctx.params.data = {
        ...ctx.params.data,
        category_picker: { category, sub_category: subCategory },
        category,
        sub_category: subCategory,
      };
    }

    // Drafts may be incomplete; what goes live needs a thumbnail, a category and a
    // sub-category of that category.
    if (ctx.action === 'publish') {
      const draft = await strapi.documents(ITEM).findOne({
        documentId: ctx.params.documentId,
        populate: {
          category: { fields: ['documentId'] },
          sub_category: { fields: ['documentId'] },
          item_thumbnail: { fields: ['id'] },
        },
      });
      if (draft) {
        // The schema marks it required, but Strapi doesn't enforce that for media.
        if (!draft.item_thumbnail) fail('Add a thumbnail before publishing.');
        if (!draft.category || !draft.sub_category) {
          fail('Choose a category and a sub-category before publishing.');
        }
        await checkPair(strapi, draft.category.documentId, draft.sub_category.documentId);
      }
    }

    return next();
  });
};

module.exports = { syncItemCategories };
