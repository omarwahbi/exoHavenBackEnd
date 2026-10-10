// Admin customizations. See src/utils/item-categories.js for the server side of
// the category picker.
export default {
  register(app) {
    app.customFields.register({
      name: 'category-picker',
      type: 'json',
      intlLabel: { id: 'category-picker.label', defaultMessage: 'Category' },
      intlDescription: {
        id: 'category-picker.description',
        defaultMessage: 'A category, then one of its sub-categories',
      },
      components: {
        Input: async () => import('./components/CategoryPicker'),
      },
    });
  },
};
