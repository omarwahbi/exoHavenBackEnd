import ItemDependentDropdowns from './custom-inputs/item/index.js';

// Register custom field components for specific content types
export default {
  bootstrap(app) {
    // Register custom fields
    app.addFields({ type: 'uid', Component: ItemDependentDropdowns });
    
    // Override main fields for Item content type
    app.registerHook({
      name: 'useCMEditViewLayoutManager',
      async handler(props) {
        const { layout, slug } = props;
        
        // Only apply to Item content type
        if (slug === 'api::item.item') {
          // Hide the sub_category field from the original layout
          // because we'll render our custom component instead
          const subCategoryFieldIndex = layout.layouts.edit.findIndex(
            row => row.some(field => field.name === 'sub_category')
          );
          
          if (subCategoryFieldIndex !== -1) {
            layout.layouts.edit[subCategoryFieldIndex] = layout.layouts.edit[subCategoryFieldIndex].filter(
              field => field.name !== 'sub_category'
            );
            
            // If the row is now empty after removing sub_category, remove the entire row
            if (layout.layouts.edit[subCategoryFieldIndex].length === 0) {
              layout.layouts.edit.splice(subCategoryFieldIndex, 1);
            }
          }
          
          // Add our custom component right after the category field
          const categoryFieldIndex = layout.layouts.edit.findIndex(
            row => row.some(field => field.name === 'category')
          );
          
          if (categoryFieldIndex !== -1) {
            // Create a new row right after the category row for our custom component
            layout.layouts.edit.splice(categoryFieldIndex + 1, 0, [
              {
                name: 'dependentDropdowns',
                size: 12,
                fieldSchema: { type: 'uid' },
              }
            ]);
          }
        }
        
        return props;
      }
    });
  }
}; 