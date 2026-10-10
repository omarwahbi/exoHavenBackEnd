'use strict';

const ITEM = 'api::item.item';
const SALE = 'api::sale.sale';

// The sale that was hard-coded in the frontend until it moved to the admin.
const INITIAL_SALE = {
  active: true,
  percent: 10,
  ends_at: '2026-12-31T23:59:59+03:00',
  show_banner: true,
  banner_text: 'على جميع المنتجات عند الطلب من الموقع',
};

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

// Only once: if someone later deletes the entry, that means no sale, not the old one.
const createSaleSettings = async (strapi) => {
  const flag = { type: 'core', name: 'exohaven_sale_created' };
  if (await strapi.store.get(flag)) return;
  const sale = strapi.documents(SALE);
  if (!(await sale.findFirst())) await sale.create({ data: INITIAL_SALE });
  await strapi.store.set({ ...flag, value: true });
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

// Friendlier labels and hints in the admin forms. Only fields still showing their
// default label (the field name) are changed, so renames made in the admin's
// "Configure the view" stay.
const FIELD_LABELS = {
  'shop.variant': {
    label: ['Label', 'What the shopper picks, e.g. "50W" or "Large".'],
    price: ['Price (IQD)', 'Before any sale discount.'],
    sku: ['SKU', ''],
    out_of_stock: ['Out of stock', ''],
    low_stock: ['Last piece / low stock', 'Shows "آخر قطعة" when this variant is chosen.'],
  },
  [SALE]: {
    active: ['Sale on', 'Turn the discount on or off for the whole shop.'],
    percent: ['Discount (%)', 'Taken off every product price while the sale is on.'],
    ends_at: ['Ends at', 'Optional. After this time the sale stops by itself.'],
    show_banner: ['Show banner', 'The strip across the top of the site while the sale is on.'],
    banner_text: ['Banner text', 'Shown next to the "خصم N%" badge.'],
  },
  [ITEM]: {
    name: ['Name', ''],
    description: ['Description', ''],
    state: ['Price (IQD)', 'Before any sale discount.'],
    Item_ID: ['SKU', 'Your own product code.'],
    new_arrival: ['New arrival', 'Listed under "وصل حديثاً" on the home page.'],
    out_of_stock: ['Out of stock', ''],
    low_stock: ['Last piece / low stock', 'Shows "آخر قطعة" on the shop, to encourage ordering soon.'],
    variants: [
      'Variants',
      'Optional: sizes, wattages or models, each with its own price. When there are variants, their prices replace the price above.',
    ],
    item_thumbnail: ['Thumbnail', 'Required to publish.'],
    item_images: ['Images', ''],
  },
};

const labelFields = async (strapi) => {
  const contentManager = strapi.plugin('content-manager');
  for (const [uid, labels] of Object.entries(FIELD_LABELS)) {
    // Components (the variant editor) have their own configuration service.
    const isComponent = !uid.includes('::');
    const service = contentManager.service(isComponent ? 'components' : 'content-types');
    const contentType = isComponent ? service.findComponent(uid) : service.findContentType(uid);
    const config = await service.findConfiguration(contentType);
    let changed = false;
    for (const [field, [label, description]] of Object.entries(labels)) {
      const edit = config.metadatas?.[field]?.edit;
      if (!edit || edit.label !== field) continue;
      config.metadatas[field] = {
        ...config.metadatas[field],
        edit: { ...edit, label, description: edit.description || description },
      };
      changed = true;
    }
    if (changed) await service.updateConfiguration(contentType, config);
  }
};

module.exports = async ({ strapi }) => {
  await allowPublicSaleRead(strapi);
  await createSaleSettings(strapi);
  await configureItemEditView(strapi);
  await labelFields(strapi);
};
