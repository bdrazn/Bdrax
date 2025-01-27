/*
  # Fix Phone Numbers Access Control

  1. Changes
    - Drop existing phone_numbers policies
    - Create simplified RLS policies for phone_numbers table
    - Allow workspace members to manage phone numbers
    - Fix workspace-based access control

  2. Security
    - Maintains data security while allowing necessary access
    - Ensures users can only access phone numbers within their workspaces
    - Simplifies policy logic for better performance
*/

-- Drop existing policies
DROP POLICY IF EXISTS "phone_numbers_select" ON phone_numbers;
DROP POLICY IF EXISTS "phone_numbers_insert" ON phone_numbers;
DROP POLICY IF EXISTS "phone_numbers_update" ON phone_numbers;
DROP POLICY IF EXISTS "phone_numbers_delete" ON phone_numbers;

-- Create new simplified policies
CREATE POLICY "phone_numbers_access"
  ON phone_numbers FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM workspace_users wu
      WHERE wu.user_id = auth.uid()
      AND wu.workspace_id = (
        SELECT workspace_id 
        FROM profiles p
        WHERE p.id = phone_numbers.owner_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM workspace_users wu
      WHERE wu.user_id = auth.uid()
      AND wu.workspace_id = (
        SELECT workspace_id 
        FROM profiles p
        WHERE p.id = phone_numbers.owner_id
      )
    )
  );

-- Add workspace_id column to phone_numbers for direct workspace association
ALTER TABLE phone_numbers
ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id);

-- Update existing records with workspace_id
UPDATE phone_numbers pn
SET workspace_id = (
  SELECT workspace_id 
  FROM profiles p
  JOIN workspace_users wu ON wu.user_id = p.id
  WHERE p.id = pn.owner_id
  LIMIT 1
)
WHERE workspace_id IS NULL;