import { supabase } from './supabase';

export interface MergeFields {
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  property?: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    type?: string;
    beds?: number;
    baths?: number;
    sqft?: number;
    lot_size?: number;
    year_built?: number;
    last_sale_date?: string;
    last_sale_price?: number;
    estimated_value?: number;
  };
}

export async function resolveMergeFields(
  templateContent: string,
  contactId: string,
  propertyId: string
): Promise<string> {
  try {
    const { data, error } = await supabase
      .rpc('resolve_merge_fields', {
        template_content: templateContent,
        contact_id: contactId,
        property_id: propertyId
      });

    if (error) throw error;
    return data || templateContent;
  } catch (error) {
    console.error('Error resolving merge fields:', error);
    return templateContent;
  }
}

export function getAvailableMergeFields(): MergeFields {
  return {
    contact: {
      name: '{{contact_name}}',
      email: '{{contact_email}}',
      phone: '{{contact_phone}}'
    },
    property: {
      address: '{{property_address}}',
      city: '{{property_city}}',
      state: '{{property_state}}',
      zip: '{{property_zip}}',
      type: '{{property_type}}',
      beds: '{{property_beds}}',
      baths: '{{property_baths}}',
      sqft: '{{property_sqft}}',
      lot_size: '{{property_lot_size}}',
      year_built: '{{property_year_built}}',
      last_sale_date: '{{property_last_sale_date}}',
      last_sale_price: '{{property_last_sale_price}}',
      estimated_value: '{{property_estimated_value}}'
    }
  };
}