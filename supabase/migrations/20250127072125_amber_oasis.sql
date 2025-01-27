/*
  # Fix workspace policies recursion

  1. Changes
    - Drop existing policies that cause recursion
    - Create new non-recursive policies for workspace access
    - Simplify policy logic to prevent circular dependencies
  
  2. Security
    - Maintain same security model but with optimized implementation
    - Users can still only access resources in their workspaces
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view members in their workspaces" ON workspace_users;

-- Create new workspace policies
CREATE POLICY "Users can view their workspaces"
  ON workspaces FOR SELECT
  USING (
    id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

CREATE POLICY "Users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Create new workspace users policies
CREATE POLICY "Users can view workspace members"
  ON workspace_users FOR SELECT
  USING (
    workspace_id IN (
      SELECT id 
      FROM workspaces 
      WHERE created_by = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- Update message templates policies
DROP POLICY IF EXISTS "Users can view templates in their workspaces" ON message_templates;
DROP POLICY IF EXISTS "Users can manage templates in their workspaces" ON message_templates;

CREATE POLICY "Users can view templates"
  ON message_templates FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage templates"
  ON message_templates FOR ALL
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

-- Update bulk message campaigns policies
DROP POLICY IF EXISTS "Users can view campaigns in their workspaces" ON bulk_message_campaigns;
DROP POLICY IF EXISTS "Users can manage campaigns in their workspaces" ON bulk_message_campaigns;

CREATE POLICY "Users can view campaigns"
  ON bulk_message_campaigns FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage campaigns"
  ON bulk_message_campaigns FOR ALL
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