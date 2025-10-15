import React, { useEffect, useState } from 'react';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import { Flex } from '@strapi/design-system/Flex';
import { RelationInput } from '@strapi/plugin-content-manager/admin/src/components/RelationInput';

/**
 * A custom component for handling dependent dropdowns between category and sub_category
 * fields in the Item content type
 */
const ItemDependentDropdowns = () => {
  const { modifiedData, onChange, initialData } = useCMEditViewDataManager();
  const [isLoading, setIsLoading] = useState(false);
  const [filteredResults, setFilteredResults] = useState(null);

  // Get current values
  const categoryValue = modifiedData?.category || null;
  const subCategoryValue = modifiedData?.sub_category || null;

  // Clear sub_category when category changes
  useEffect(() => {
    // If category is cleared or changed, check if we need to clear sub_category
    if (!categoryValue?.id && subCategoryValue) {
      // If no category selected but sub_category is selected, clear it
      onChange({ target: { name: 'sub_category', value: null } });
    }
    
    // Reset filtered results when category changes
    setFilteredResults(null);
  }, [categoryValue?.id, onChange, subCategoryValue]);

  // Pre-fetch matching subcategories whenever category changes
  useEffect(() => {
    const fetchSubcategoriesForCategory = async () => {
      if (!categoryValue?.id) return;
      
      try {
        setIsLoading(true);
        
        // Fetch ALL subcategories from the regular API endpoint with their categories
        const response = await fetch(`/api/sub-categories?populate=category`);
        const data = await response.json();
        
        if (data?.data && Array.isArray(data.data)) {
          // Filter subcategories that match the selected category
          const filtered = data.data.filter(sc => 
            sc.attributes.category?.data?.id === categoryValue.id
          );
          
          console.log('Filtered subcategories for category', categoryValue.id, ':', filtered);
          
          // Store the filtered results for use in onRelationLoad
          setFilteredResults(filtered);
        }
      } catch (error) {
        console.error('Error fetching subcategories for filtering:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSubcategoriesForCategory();
  }, [categoryValue?.id]);

  // We don't render the category field here as we want to keep the default one
  // We just render the sub_category field with filtered options
  return (
    <Box padding={4}>
      <Flex direction="column" gap={2}>
        <Typography variant="pi" fontWeight="bold">
          Sub Category ({categoryValue?.id ? `Filtered by category ID: ${categoryValue.id}` : 'No category selected'})
        </Typography>
        <RelationInput
          description=""
          intlLabel={{ id: 'sub_category', defaultMessage: 'Sub Category' }}
          labelAction={null}
          name="sub_category"
          relationType="oneToOne"
          step={1}
          value={subCategoryValue}
          disabled={!categoryValue?.id}
          error={null}
          onChange={value => {
            onChange({ target: { name: 'sub_category', value } });
          }}
          // This is the key part - intercepting the relation load request
          onRelationLoad={async (search, loadedOptions) => {
            console.log('onRelationLoad triggered with search:', search);
            
            if (!categoryValue?.id) {
              console.log('No category selected, returning empty array');
              return { data: [] };
            }
            
            try {
              setIsLoading(true);
              
              // Get the relation data from Strapi's admin endpoint
              const url = `/content-manager/relations/api::item.item/sub_category?pageSize=100&page=1${search ? `&_q=${search}` : ''}`;
              console.log('Original relation fetch URL:', url);
              
              const response = await fetch(url);
              const data = await response.json();
              console.log('Original relation response:', data);
              
              if (filteredResults && data?.results) {
                // Extract IDs of the subcategories that match our category
                const validSubcategoryIds = filteredResults.map(sc => sc.id);
                console.log('Valid subcategory IDs for this category:', validSubcategoryIds);
                
                // Filter the results to only include subcategories that match our category
                const filteredResponse = data.results.filter(sc => 
                  validSubcategoryIds.includes(sc.id)
                );
                
                console.log('Filtered relation response:', filteredResponse);
                
                // Return the filtered results
                return { data: filteredResponse };
              }
              
              // If we don't have filtered results yet, return empty array 
              // to prevent showing all subcategories
              return { data: [] };
            } catch (error) {
              console.error('Error in onRelationLoad:', error);
              return { data: [] };
            } finally {
              setIsLoading(false);
            }
          }}
        />
      </Flex>
    </Box>
  );
};

export default ItemDependentDropdowns; 