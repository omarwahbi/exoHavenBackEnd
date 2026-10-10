import { useEffect, useState } from 'react';
import { useFetchClient } from '@strapi/strapi/admin';
import { Field, Grid, SingleSelect, SingleSelectOption } from '@strapi/design-system';

// Category + sub-category picker for items. The sub-category list stays disabled
// until a category is chosen, and then only offers that category's sub-categories.
// The value is { category, sub_category } (documentIds); the server copies it into
// the item's relations and rejects pairs that don't match.

const CATEGORY = 'api::category.category';
const SUB_CATEGORY = 'api::sub-category.sub-category';

// Entries of a content type as { documentId, name }, sorted by name. Skipped while
// `params` is null.
const useEntries = (uid, params) => {
  const { get } = useFetchClient();
  const [entries, setEntries] = useState([]);
  const key = JSON.stringify(params);

  useEffect(() => {
    if (params === null) {
      setEntries([]);
      return undefined;
    }
    let cancelled = false;
    get(`/content-manager/collection-types/${uid}`, {
      params: { page: 1, pageSize: 100, sort: 'name:ASC', ...params },
    })
      .then(({ data }) => {
        if (!cancelled) setEntries(data.results.map(({ documentId, name }) => ({ documentId, name })));
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, key]);

  return entries;
};

const CategoryPicker = ({ name, value, onChange, hint, error, required, disabled }) => {
  const category = value?.category ?? null;
  const subCategory = value?.sub_category ?? null;

  const categories = useEntries(CATEGORY, {});
  const subCategories = useEntries(
    SUB_CATEGORY,
    category ? { filters: { category: { documentId: { $eq: category } } } } : null
  );

  const setCategory = (next) => {
    if ((next || null) === category) return;
    onChange(name, { category: next || null, sub_category: null });
  };
  const setSubCategory = (next) => onChange(name, { category, sub_category: next || null });

  return (
    <Grid.Root gap={4}>
      <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
        <Field.Root name={`${name}.category`} required={required} hint={hint}>
          <Field.Label>Category</Field.Label>
          <SingleSelect
            placeholder="Choose a category"
            value={category ?? undefined}
            onChange={setCategory}
            onClear={() => setCategory(null)}
            disabled={disabled}
          >
            {categories.map((entry) => (
              <SingleSelectOption key={entry.documentId} value={entry.documentId}>
                {entry.name || entry.documentId}
              </SingleSelectOption>
            ))}
          </SingleSelect>
          <Field.Hint />
        </Field.Root>
      </Grid.Item>
      <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
        <Field.Root name={`${name}.sub_category`} required={required} error={error}>
          <Field.Label>Sub-category</Field.Label>
          <SingleSelect
            placeholder={category ? 'Choose a sub-category' : 'Choose a category first'}
            value={subCategory ?? undefined}
            onChange={setSubCategory}
            onClear={() => setSubCategory(null)}
            disabled={disabled || !category}
          >
            {subCategories.map((entry) => (
              <SingleSelectOption key={entry.documentId} value={entry.documentId}>
                {entry.name || entry.documentId}
              </SingleSelectOption>
            ))}
          </SingleSelect>
          <Field.Error />
        </Field.Root>
      </Grid.Item>
    </Grid.Root>
  );
};

export default CategoryPicker;
