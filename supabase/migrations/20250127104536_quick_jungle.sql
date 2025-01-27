/*
  # Campaign Job Management System

  1. New Tables
    - campaign_jobs: Tracks individual campaign jobs
    - campaign_message_tracking: Tracks sent messages and prevents duplicates
    - campaign_phone_tracking: Tracks phone number frequency
    - campaign_error_logs: Logs errors and retries

  2. Changes
    - Add job tracking fields to bulk_message_campaigns
    - Add frequency tracking to phone_numbers

  3. Security
    - Enable RLS on all new tables
    - Add policies for workspace access
*/

-- Add job tracking fields to bulk_message_campaigns
ALTER TABLE bulk_message_campaigns
ADD COLUMN IF NOT EXISTS max_messages_per_number integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS respect_global_limits boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS current_job_id uuid;

-- Create campaign jobs table
CREATE TABLE IF NOT EXISTS campaign_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES bulk_message_campaigns(id),
  workspace_id uuid REFERENCES workspaces(id),
  status text CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
  total_properties integer DEFAULT 0,
  processed_properties integer DEFAULT 0,
  total_messages integer DEFAULT 0,
  sent_messages integer DEFAULT 0,
  failed_messages integer DEFAULT 0,
  started_at timestamptz,
  paused_at timestamptz,
  completed_at timestamptz,
  error_message text,
  retry_count integer DEFAULT 0,
  next_retry_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create campaign message tracking table
CREATE TABLE IF NOT EXISTS campaign_message_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES bulk_message_campaigns(id),
  property_id uuid REFERENCES properties(id),
  phone_number text NOT NULL,
  message_template_id uuid REFERENCES message_templates(id),
  status text CHECK (status IN ('sent', 'delivered', 'failed')),
  sent_at timestamptz DEFAULT now(),
  error_message text,
  UNIQUE(campaign_id, property_id, phone_number)
);

-- Create campaign phone tracking table
CREATE TABLE IF NOT EXISTS campaign_phone_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES bulk_message_campaigns(id),
  phone_number text NOT NULL,
  message_count integer DEFAULT 0,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, phone_number)
);

-- Create campaign error logs table
CREATE TABLE IF NOT EXISTS campaign_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES bulk_message_campaigns(id),
  job_id uuid REFERENCES campaign_jobs(id),
  error_type text NOT NULL,
  error_message text NOT NULL,
  stack_trace text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE campaign_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_message_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_phone_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_error_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "campaign_jobs_access"
  ON campaign_jobs FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
  ))
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "campaign_message_tracking_access"
  ON campaign_message_tracking FOR ALL
  USING (campaign_id IN (
    SELECT id FROM bulk_message_campaigns
    WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (campaign_id IN (
    SELECT id FROM bulk_message_campaigns
    WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "campaign_phone_tracking_access"
  ON campaign_phone_tracking FOR ALL
  USING (campaign_id IN (
    SELECT id FROM bulk_message_campaigns
    WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (campaign_id IN (
    SELECT id FROM bulk_message_campaigns
    WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "campaign_error_logs_access"
  ON campaign_error_logs FOR ALL
  USING (campaign_id IN (
    SELECT id FROM bulk_message_campaigns
    WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (campaign_id IN (
    SELECT id FROM bulk_message_campaigns
    WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  ));

-- Create indexes for performance
CREATE INDEX idx_campaign_jobs_status ON campaign_jobs(status);
CREATE INDEX idx_campaign_jobs_campaign_id ON campaign_jobs(campaign_id);
CREATE INDEX idx_message_tracking_campaign_id ON campaign_message_tracking(campaign_id);
CREATE INDEX idx_message_tracking_phone ON campaign_message_tracking(phone_number);
CREATE INDEX idx_phone_tracking_campaign_id ON campaign_phone_tracking(campaign_id);
CREATE INDEX idx_phone_tracking_number ON campaign_phone_tracking(phone_number);
CREATE INDEX idx_error_logs_campaign_id ON campaign_error_logs(campaign_id);
CREATE INDEX idx_error_logs_job_id ON campaign_error_logs(job_id);

-- Create function to check message limits
CREATE OR REPLACE FUNCTION check_message_limits(
  p_phone_number text,
  p_campaign_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign_limit integer;
  v_campaign_count integer;
  v_global_limit integer;
  v_global_count integer;
  v_respect_global boolean;
BEGIN
  -- Get campaign settings
  SELECT max_messages_per_number, respect_global_limits
  INTO v_campaign_limit, v_respect_global
  FROM bulk_message_campaigns
  WHERE id = p_campaign_id;

  -- Check campaign-specific limit
  SELECT message_count INTO v_campaign_count
  FROM campaign_phone_tracking
  WHERE campaign_id = p_campaign_id AND phone_number = p_phone_number;

  IF v_campaign_count >= v_campaign_limit THEN
    RETURN false;
  END IF;

  -- Check global limit if enabled
  IF v_respect_global THEN
    SELECT daily_message_limit INTO v_global_limit
    FROM user_settings
    WHERE user_id = auth.uid();

    SELECT COUNT(*) INTO v_global_count
    FROM campaign_message_tracking
    WHERE phone_number = p_phone_number
    AND sent_at >= CURRENT_DATE;

    IF v_global_count >= v_global_limit THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;