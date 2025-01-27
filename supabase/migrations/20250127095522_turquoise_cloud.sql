-- Create property lists table
CREATE TABLE IF NOT EXISTS property_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) NOT NULL,
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, name)
);

-- Create property list items table
CREATE TABLE IF NOT EXISTS property_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES property_lists(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  added_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(list_id, property_id)
);

-- Enable RLS
ALTER TABLE property_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_list_items ENABLE ROW LEVEL SECURITY;

-- Create policies for property lists
CREATE POLICY "property_lists_access"
  ON property_lists FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid()
    )
  );

-- Create policies for property list items
CREATE POLICY "property_list_items_access"
  ON property_list_items FOR ALL
  USING (
    list_id IN (
      SELECT id 
      FROM property_lists 
      WHERE workspace_id IN (
        SELECT workspace_id 
        FROM workspace_users 
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    list_id IN (
      SELECT id 
      FROM property_lists 
      WHERE workspace_id IN (
        SELECT workspace_id 
        FROM workspace_users 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Create function to count properties in a list
CREATE OR REPLACE FUNCTION get_property_list_count(list_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)
  FROM property_list_items
  WHERE list_id = $1;
$$;