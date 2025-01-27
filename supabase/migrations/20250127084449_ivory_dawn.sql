/*
  # Add contact-property relationship for merge fields

  1. Changes
    - Add contact_properties table for explicit contact-property relationships
    - Update message_templates table to support property merge fields
    - Add functions for resolving merge fields
  
  2. Notes
    - Maintains existing owner_property_relations table
    - Adds new relationship types for better contact management
    - Includes merge field resolution functions
*/

-- Create contact_properties table for explicit relationships
CREATE TABLE IF NOT EXISTS contact_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES profiles(id),
  property_id uuid REFERENCES properties(id),
  relationship_type text CHECK (relationship_type IN (
    'owner',
    'previous_owner',
    'tenant',
    'agent',
    'property_manager',
    'interested_buyer'
  )),
  primary_contact boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(contact_id, property_id, relationship_type)
);

-- Enable RLS
ALTER TABLE contact_properties ENABLE ROW LEVEL SECURITY;

-- Create policy for contact_properties
CREATE POLICY "contact_properties_access"
  ON contact_properties FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM properties p
      JOIN workspace_users wu ON wu.workspace_id = p.workspace_id
      WHERE p.id = contact_properties.property_id
      AND wu.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM properties p
      JOIN workspace_users wu ON wu.workspace_id = p.workspace_id
      WHERE p.id = contact_properties.property_id
      AND wu.user_id = auth.uid()
    )
  );

-- Create function to get property merge fields
CREATE OR REPLACE FUNCTION get_property_merge_fields(property_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  property_data jsonb;
BEGIN
  SELECT jsonb_build_object(
    'property_address', p.address,
    'property_city', p.city,
    'property_state', p.state,
    'property_zip', p.zip,
    'property_type', p.property_type,
    'property_beds', p.bedrooms,
    'property_baths', p.bathrooms,
    'property_sqft', p.square_feet,
    'property_lot_size', p.lot_size,
    'property_year_built', p.year_built,
    'property_last_sale_date', p.last_sale_date,
    'property_last_sale_price', p.last_sale_price,
    'property_estimated_value', p.estimated_value
  )
  INTO property_data
  FROM properties p
  WHERE p.id = property_id;

  RETURN property_data;
END;
$$;

-- Create function to get contact merge fields
CREATE OR REPLACE FUNCTION get_contact_merge_fields(contact_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  contact_data jsonb;
BEGIN
  SELECT jsonb_build_object(
    'contact_name', p.full_name,
    'contact_email', p.email,
    'contact_phone', (
      SELECT pn.number
      FROM phone_numbers pn
      WHERE pn.owner_id = p.id
      ORDER BY pn.created_at
      LIMIT 1
    )
  )
  INTO contact_data
  FROM profiles p
  WHERE p.id = contact_id;

  RETURN contact_data;
END;
$$;

-- Create function to resolve all merge fields
CREATE OR REPLACE FUNCTION resolve_merge_fields(
  template_content text,
  contact_id uuid,
  property_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  merged_content text;
  contact_fields jsonb;
  property_fields jsonb;
BEGIN
  -- Get merge fields
  contact_fields := get_contact_merge_fields(contact_id);
  property_fields := get_property_merge_fields(property_id);
  
  -- Start with template content
  merged_content := template_content;
  
  -- Replace contact fields
  merged_content := regexp_replace(
    merged_content,
    '\{\{contact_(.*?)\}\}',
    (contact_fields->>'\1')::text,
    'g'
  );
  
  -- Replace property fields
  merged_content := regexp_replace(
    merged_content,
    '\{\{property_(.*?)\}\}',
    (property_fields->>'\1')::text,
    'g'
  );
  
  RETURN merged_content;
END;
$$;