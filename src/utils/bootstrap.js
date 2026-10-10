'use strict';

const ITEM = 'api::item.item';
const SALE = 'api::sale.sale';

// The sale that was hard-coded in the frontend until it moved to the admin.
const INITIAL_SALE = { active: true, percent: 10, ends_at: '2026-12-31T23:59:59+03:00' };

// The shop reads the sale settings without logging in.
const allowPublicSaleRead = async (strapi) => {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'public' } });
  if (!role) return;
  const action = `${SALE}.find`;
  const permissions = strapi.db.query('plugin::users-permissions.permission');
  if (!(await permissions.findOne({ where: { action, role: role.id } }))) {
    await permissions.create({ data: { action, role: role.id } });
  }
};

const createSaleSettings = async (strapi) => {
  const sale = strapi.documents(SALE);
  if (!(await sale.findFirst())) await sale.create({ data: INITIAL_SALE });
};

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
  await allowPublicSaleRead(strapi);
  await createSaleSettings(strapi);
  await configureItemEditView(strapi);
};
