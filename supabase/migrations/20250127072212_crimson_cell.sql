/*
  # Simplify workspace access policies

  1. Changes
    - Simplify workspace access policies to use direct user relationships
    - Remove nested subqueries that could cause recursion
    - Add basic workspace member access policies
  
  2. Security
    - Maintain same security model with simpler implementation
    - Users can still only access resources in their workspaces
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_users;
DROP POLICY IF EXISTS "Users can view templates" ON message_templates;
DROP POLICY IF EXISTS "Users can manage templates" ON message_templates;
DROP POLICY IF EXISTS "Users can view campaigns" ON bulk_message_campaigns;
DROP POLICY IF EXISTS "Users can manage campaigns" ON bulk_message_campaigns;

-- Basic workspace access
CREATE POLICY "workspace_member_access"
  ON workspace_users FOR SELECT
  USING (user_id = auth.uid());

-- Workspace policies
CREATE POLICY "workspace_access"
  ON workspaces FOR SELECT
  USING (created_by = auth.uid() OR 
         id IN (SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()));

CREATE POLICY "workspace_insert"
  ON workspaces FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Message template policies
CREATE POLICY "template_select"
  ON message_templates FOR SELECT
  USING (created_by = auth.uid() OR 
         workspace_id IN (SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()));

CREATE POLICY "template_insert"
  ON message_templates FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()));

CREATE POLICY "template_update"
  ON message_templates FOR UPDATE
  USING (created_by = auth.uid() OR 
         workspace_id IN (SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()));

CREATE POLICY "template_delete"
  ON message_templates FOR DELETE
  USING (created_by = auth.uid() OR 
         workspace_id IN (SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()));

-- Campaign policies
CREATE POLICY "campaign_select"
  ON bulk_message_campaigns FOR SELECT
  USING (created_by = auth.uid() OR 
         workspace_id IN (SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()));

CREATE POLICY "campaign_insert"
  ON bulk_message_campaigns FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()));

CREATE POLICY "campaign_update"
  ON bulk_message_campaigns FOR UPDATE
  USING (created_by = auth.uid() OR 
         workspace_id IN (SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()));

CREATE POLICY "campaign_delete"
  ON bulk_message_campaigns FOR DELETE
  USING (created_by = auth.uid() OR 
         workspace_id IN (SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()));