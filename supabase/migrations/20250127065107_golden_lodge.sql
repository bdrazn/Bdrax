/*
  # Bulk Messaging System

  1. New Tables
    - `message_templates`
      - Reusable message templates with merge fields
    - `bulk_message_campaigns`
      - Tracks bulk message campaigns
    - `bulk_message_stats`
      - Real-time message delivery tracking
    - `phone_numbers`
      - Store phone numbers for properties/contacts

  2. Security
    - Enable RLS on all tables
    - Add policies for workspace access
*/

-- Add phone_numbers table
CREATE TABLE IF NOT EXISTS phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id),
  owner_id uuid REFERENCES profiles(id),
  number text NOT NULL,
  type text CHECK (type IN ('mobile', 'home', 'work', 'other')),
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(property_id, owner_id, number)
);

-- Add message_templates table
CREATE TABLE IF NOT EXISTS message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  name text NOT NULL,
  content text NOT NULL,
  merge_fields jsonb DEFAULT '[]',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add bulk_message_campaigns table
CREATE TABLE IF NOT EXISTS bulk_message_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  name text NOT NULL,
  template_id uuid REFERENCES message_templates(id),
  status text CHECK (status IN ('draft', 'scheduled', 'running', 'completed', 'failed')) DEFAULT 'draft',
  scheduled_for timestamptz,
  target_list jsonb NOT NULL, -- Stores filter criteria
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add bulk_message_stats table
CREATE TABLE IF NOT EXISTS bulk_message_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES bulk_message_campaigns(id),
  total_messages integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  delivered_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  response_count integer DEFAULT 0,
  interested_count integer DEFAULT 0,
  not_interested_count integer DEFAULT 0,
  dnc_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_message_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_message_stats ENABLE ROW LEVEL SECURITY;

-- Phone numbers policies
CREATE POLICY "Users can view phone numbers in their workspaces"
  ON phone_numbers FOR SELECT
  USING (property_id IN (
    SELECT id FROM properties
    WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_users
      WHERE user_id = auth.uid()
    )
  ));

-- Message templates policies
CREATE POLICY "Users can view templates in their workspaces"
  ON message_templates FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_users
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage templates in their workspaces"
  ON message_templates FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_users
    WHERE user_id = auth.uid()
  ))
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_users
    WHERE user_id = auth.uid()
  ));

-- Bulk message campaigns policies
CREATE POLICY "Users can view campaigns in their workspaces"
  ON bulk_message_campaigns FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_users
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage campaigns in their workspaces"
  ON bulk_message_campaigns FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_users
    WHERE user_id = auth.uid()
  ))
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_users
    WHERE user_id = auth.uid()
  ));

-- Bulk message stats policies
CREATE POLICY "Users can view stats in their workspaces"
  ON bulk_message_stats FOR SELECT
  USING (campaign_id IN (
    SELECT id FROM bulk_message_campaigns
    WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_users
      WHERE user_id = auth.uid()
    )
  ));