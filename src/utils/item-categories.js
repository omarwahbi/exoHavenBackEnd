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

// Duplicating an item in the admin is a clone with the edited form as its data.
const WRITE_ACTIONS = ['create', 'update', 'clone'];

const syncPickerFromRelations = async (strapi, documentId) => {
  const draft = await strapi.documents(ITEM).findOne({
    documentId,
    fields: ['id'],
    populate: { category: { fields: ['documentId'] }, sub_category: { fields: ['documentId'] } },
  });
  if (!draft) return;
  await strapi.db.query(ITEM).update({
    where: { id: draft.id },
    data: {
      category_picker: {
        category: draft.category?.documentId ?? null,
        sub_category: draft.sub_category?.documentId ?? null,
      },
    },
  });
};

const syncItemCategories = (strapi) => {
  strapi.documents.use(async (ctx, next) => {
    if (ctx.uid !== ITEM) return next();

    const writes = WRITE_ACTIONS.includes(ctx.action) && ctx.params?.data;
    const pickerGiven = writes && ctx.params.data.category_picker !== undefined;
    const relationsGiven =
      writes && !pickerGiven && (ctx.params.data.category !== undefined || ctx.params.data.sub_category !== undefined);

    // From the admin: the picker decides the relations.
    if (pickerGiven) {
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

    const result = await next();

    // From the API or MCP, the relations were set directly: copy them into the
    // picker, so the admin shows them and its next save doesn't put the old ones
    // back. (The pair is checked when the item is published.)
    if (relationsGiven && result?.documentId) {
      await syncPickerFromRelations(strapi, result.documentId);
    }
    return result;
  });
};

module.exports = { syncItemCategories };
