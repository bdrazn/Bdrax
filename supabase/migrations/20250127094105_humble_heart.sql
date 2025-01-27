-- Add workspace_id to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id);

-- Update existing profiles with workspace_id
UPDATE profiles p
SET workspace_id = (
  SELECT workspace_id 
  FROM workspace_users wu 
  WHERE wu.user_id = p.id 
  LIMIT 1
)
WHERE workspace_id IS NULL;

-- Add workspace_id to contact_properties
ALTER TABLE contact_properties
ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id);

-- Update existing contact_properties with workspace_id
UPDATE contact_properties cp
SET workspace_id = (
  SELECT workspace_id 
  FROM properties p 
  WHERE p.id = cp.property_id
)
WHERE workspace_id IS NULL;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view workspace member profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new policies for profiles
CREATE POLICY "profiles_access"
  ON profiles FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid()
    )
    OR id = auth.uid()
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid()
    )
    OR id = auth.uid()
  );

-- Update contact_properties policy
DROP POLICY IF EXISTS "contact_properties_access" ON contact_properties;

CREATE POLICY "contact_properties_access"
  ON contact_properties FOR ALL
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

-- Add default values for required fields in properties
ALTER TABLE properties
ALTER COLUMN city SET DEFAULT 'Unknown',
ALTER COLUMN state SET DEFAULT 'Unknown',
ALTER COLUMN zip SET DEFAULT 'Unknown';