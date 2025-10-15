# Dependent Dropdown for Strapi Admin

This extension adds dependent dropdown functionality between `category` and `sub_category` fields in the Item content type edit view.

## How it works

1. When selecting a Category in the Item edit form, the Sub Category dropdown will be automatically filtered to only show sub-categories that belong to the selected category.
2. If the Category selection is cleared, the Sub Category field will also be cleared and disabled.
3. If a Sub Category is already selected and you change the Category to one that doesn't contain that Sub Category, the selection will be cleared.

## Technical Implementation

This customization:

1. Creates a custom React component (`ItemDependentDropdowns`) that uses the Strapi Admin API to:

   - Get the current form data using `useCMEditViewDataManager`
   - Fetch filtered sub-categories based on the selected category
   - Render a custom Relation input field with the filtered options

2. Modifies the Item edit view layout by:

   - Removing the default sub_category field from the layout
   - Adding our custom component after the category field

3. Registers this customization with Strapi Admin by:
   - Registering a custom plugin
   - Registering a custom field type
   - Registering a layout hook to modify the edit view layout

## Troubleshooting

If the dependent dropdown is not working:

1. Check the browser console for any errors
2. Verify that the Item content type has the correct relationship fields:
   - `category` with a relation to Category content type
   - `sub_category` with a relation to Sub Category content type
3. Make sure the Sub Category content type has a `category` relation field that links back to Category
