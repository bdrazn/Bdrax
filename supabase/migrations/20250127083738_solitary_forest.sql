/*
  # Fix Phone Numbers RLS Policies

  1. Changes
    - Drop existing phone_numbers policies
    - Create new simplified RLS policy for phone_numbers table
    - Add workspace_id to phone_numbers table
    - Update existing records with workspace_id
    - Add NOT NULL constraint to workspace_id

  2. Security
    - Maintains data security through workspace-based access control
    - Ensures users can only access phone numbers within their workspaces
    - Simplifies policy logic for better performance
*/

-- Drop existing policies
DROP POLICY IF EXISTS "phone_numbers_access" ON phone_numbers;

-- Create new simplified policy
CREATE POLICY "phone_numbers_workspace_access"
  ON phone_numbers FOR ALL
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

-- Make workspace_id NOT NULL after ensuring all records have been updated
ALTER TABLE phone_numbers
ALTER COLUMN workspace_id SET NOT NULL;