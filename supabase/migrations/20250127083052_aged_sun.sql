/*
  # Add SMS messaging support

  1. New Tables
    - `sms_messages` - Stores all SMS messages sent and received
    - `sms_templates` - Stores SMS message templates
  
  2. Changes
    - Add SMS-related fields to existing tables
    - Add functions for analytics updates
*/

-- Create SMS messages table
CREATE TABLE IF NOT EXISTS sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  external_id text,
  from_number text NOT NULL,
  to_number text NOT NULL,
  content text NOT NULL,
  status text CHECK (status IN ('sent', 'delivered', 'failed', 'received')),
  direction text CHECK (direction IN ('outbound', 'inbound')),
  sent_at timestamptz,
  delivered_at timestamptz,
  received_at timestamptz,
  campaign_id uuid REFERENCES bulk_message_campaigns(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on new table
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for SMS messages
CREATE POLICY "workspace_sms_messages_select"
  ON sms_messages FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "workspace_sms_messages_insert"
  ON sms_messages FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
  ));

-- Create function to upsert message analytics
CREATE OR REPLACE FUNCTION upsert_message_analytics(
  p_workspace_id uuid,
  p_date date,
  p_updates jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO message_analytics (
    workspace_id,
    date,
    messages_sent,
    messages_delivered,
    responses_received,
    interested_count,
    not_interested_count,
    dnc_count
  )
  VALUES (
    p_workspace_id,
    p_date,
    COALESCE((p_updates->>'messages_sent')::int, 0),
    COALESCE((p_updates->>'messages_delivered')::int, 0),
    COALESCE((p_updates->>'responses_received')::int, 0),
    COALESCE((p_updates->>'interested_count')::int, 0),
    COALESCE((p_updates->>'not_interested_count')::int, 0),
    COALESCE((p_updates->>'dnc_count')::int, 0)
  )
  ON CONFLICT (workspace_id, date)
  DO UPDATE SET
    messages_sent = message_analytics.messages_sent + COALESCE((p_updates->>'messages_sent')::int, 0),
    messages_delivered = message_analytics.messages_delivered + COALESCE((p_updates->>'messages_delivered')::int, 0),
    responses_received = message_analytics.responses_received + COALESCE((p_updates->>'responses_received')::int, 0),
    interested_count = message_analytics.interested_count + COALESCE((p_updates->>'interested_count')::int, 0),
    not_interested_count = message_analytics.not_interested_count + COALESCE((p_updates->>'not_interested_count')::int, 0),
    dnc_count = message_analytics.dnc_count + COALESCE((p_updates->>'dnc_count')::int, 0),
    updated_at = now();
END;
$$;