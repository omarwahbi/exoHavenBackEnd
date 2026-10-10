import type { Schema, Struct } from '@strapi/strapi';

export interface ShopVariant extends Struct.ComponentSchema {
  collectionName: 'components_shop_variants';
  info: {
    description: 'One version of a product (a size, a wattage, a model) with its own price';
    displayName: 'Variant';
    icon: 'layer';
  };
  attributes: {
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    low_stock: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    out_of_stock: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    price: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    sku: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'shop.variant': ShopVariant;
    }
  }
}
