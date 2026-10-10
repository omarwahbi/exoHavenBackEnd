'use strict';

const ITEM = 'api::item.item';

// In the item edit view, category and sub-category are edited through
// category_picker; the relations themselves and legacy_id stay out of the form.
const HIDDEN_ITEM_FIELDS = ['category', 'sub_category', 'legacy_id'];

const configureItemEditView = async (strapi) => {
  const contentTypes = strapi.plugin('content-manager').service('content-types');
  const contentType = contentTypes.findContentType(ITEM);
  const config = await contentTypes.findConfiguration(contentType);
  // Drop the hidden fields, then put the picker on its own row under the first one
  // (Strapi appends new fields at the end of the layout).
  const rows = config.layouts.edit
    .map((row) => row.filter((field) => ![...HIDDEN_ITEM_FIELDS, 'category_picker'].includes(field.name)))
    .filter((row) => row.length > 0);
  const ordered = [...rows.slice(0, 1), [{ name: 'category_picker', size: 12 }], ...rows.slice(1)];
  if (JSON.stringify(ordered) !== JSON.stringify(config.layouts.edit)) {
    await contentTypes.updateConfiguration(contentType, {
      ...config,
      layouts: { ...config.layouts, edit: ordered },
    });
  }
};

module.exports = async ({ strapi }) => {
  await configureItemEditView(strapi);
};
