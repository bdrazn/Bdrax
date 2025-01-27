/*
  # Fix Phone Numbers RLS Policies

  1. Changes
    - Drop existing phone_numbers RLS policies
    - Create new policies for phone_numbers table
    - Allow workspace members to view phone numbers
    - Allow users to manage phone numbers in their workspaces

  2. Security
    - Maintains data security while allowing necessary access
    - Ensures users can only access phone numbers they should see
    - Preserves workspace-based access control
*/

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view phone numbers in their workspaces" ON phone_numbers;

-- Create new policies for phone_numbers table
CREATE POLICY "phone_numbers_select"
  ON phone_numbers FOR SELECT
  USING (
    owner_id IN (
      SELECT user_id 
      FROM workspace_users wu
      WHERE wu.workspace_id IN (
        SELECT workspace_id 
        FROM workspace_users 
        WHERE user_id = auth.uid()
      )
    )
    OR
    property_id IN (
      SELECT id 
      FROM properties 
      WHERE workspace_id IN (
        SELECT workspace_id 
        FROM workspace_users 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "phone_numbers_insert"
  ON phone_numbers FOR INSERT
  WITH CHECK (
    owner_id IN (
      SELECT user_id 
      FROM workspace_users wu
      WHERE wu.workspace_id IN (
        SELECT workspace_id 
        FROM workspace_users 
        WHERE user_id = auth.uid()
      )
    )
    OR
    property_id IN (
      SELECT id 
      FROM properties 
      WHERE workspace_id IN (
        SELECT workspace_id 
        FROM workspace_users 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "phone_numbers_update"
  ON phone_numbers FOR UPDATE
  USING (
    owner_id IN (
      SELECT user_id 
      FROM workspace_users wu
      WHERE wu.workspace_id IN (
        SELECT workspace_id 
        FROM workspace_users 
        WHERE user_id = auth.uid()
      )
    )
    OR
    property_id IN (
      SELECT id 
      FROM properties 
      WHERE workspace_id IN (
        SELECT workspace_id 
        FROM workspace_users 
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    owner_id IN (
      SELECT user_id 
      FROM workspace_users wu
      WHERE wu.workspace_id IN (
        SELECT workspace_id 
        FROM workspace_users 
        WHERE user_id = auth.uid()
      )
    )
    OR
    property_id IN (
      SELECT id 
      FROM properties 
      WHERE workspace_id IN (
        SELECT workspace_id 
        FROM workspace_users 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "phone_numbers_delete"
  ON phone_numbers FOR DELETE
  USING (
    owner_id IN (
      SELECT user_id 
      FROM workspace_users wu
      WHERE wu.workspace_id IN (
        SELECT workspace_id 
        FROM workspace_users 
        WHERE user_id = auth.uid()
      )
    )
    OR
    property_id IN (
      SELECT id 
      FROM properties 
      WHERE workspace_id IN (
        SELECT workspace_id 
        FROM workspace_users 
        WHERE user_id = auth.uid()
      )
    )
  );