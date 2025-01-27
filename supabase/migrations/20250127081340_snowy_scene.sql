/*
  # Job Tracker and Campaign Management System

  1. New Tables
    - `job_schedules` - For configuring message sending windows
    - `message_jobs` - For tracking message sending tasks
    - `job_logs` - For tracking job execution history
    - `message_analytics` - For KPI tracking

  2. Changes
    - Add automation fields to bulk_message_campaigns
    - Add scheduling fields to user_settings

  3. Security
    - Enable RLS on all new tables
    - Add policies for workspace-based access
*/

-- Add message sending window configuration to user_settings
ALTER TABLE user_settings
ADD COLUMN message_window_start time DEFAULT '08:00:00',
ADD COLUMN message_window_end time DEFAULT '21:00:00';

-- Create job schedules table
CREATE TABLE IF NOT EXISTS job_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  name text NOT NULL,
  cron_expression text NOT NULL,
  enabled boolean DEFAULT true,
  last_run timestamptz,
  next_run timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create message jobs table
CREATE TABLE IF NOT EXISTS message_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  campaign_id uuid REFERENCES bulk_message_campaigns(id),
  status text CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed')) DEFAULT 'pending',
  total_messages integer DEFAULT 0,
  processed_messages integer DEFAULT 0,
  daily_limit_reached boolean DEFAULT false,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create job logs table
CREATE TABLE IF NOT EXISTS job_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES message_jobs(id),
  event_type text CHECK (event_type IN ('start', 'pause', 'resume', 'complete', 'fail', 'limit_reached')),
  message text,
  created_at timestamptz DEFAULT now()
);

-- Create message analytics table
CREATE TABLE IF NOT EXISTS message_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  date date NOT NULL,
  messages_sent integer DEFAULT 0,
  messages_delivered integer DEFAULT 0,
  messages_failed integer DEFAULT 0,
  responses_received integer DEFAULT 0,
  interested_count integer DEFAULT 0,
  not_interested_count integer DEFAULT 0,
  dnc_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, date)
);

-- Add automation fields to bulk_message_campaigns
ALTER TABLE bulk_message_campaigns
ADD COLUMN is_automated boolean DEFAULT false,
ADD COLUMN schedule_id uuid REFERENCES job_schedules(id),
ADD COLUMN auto_pause_on_limit boolean DEFAULT true;

-- Enable RLS
ALTER TABLE job_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for job schedules
CREATE POLICY "workspace_job_schedules_select"
  ON job_schedules FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "workspace_job_schedules_insert"
  ON job_schedules FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "workspace_job_schedules_update"
  ON job_schedules FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
  ))
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
  ));

-- Create policies for message jobs
CREATE POLICY "workspace_message_jobs_select"
  ON message_jobs FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
  ));

-- Create policies for job logs
CREATE POLICY "workspace_job_logs_select"
  ON job_logs FOR SELECT
  USING (job_id IN (
    SELECT id FROM message_jobs
    WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  ));

-- Create policies for message analytics
CREATE POLICY "workspace_analytics_select"
  ON message_analytics FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
  ));

-- Create indexes for performance
CREATE INDEX idx_message_jobs_campaign_id ON message_jobs(campaign_id);
CREATE INDEX idx_message_jobs_status ON message_jobs(status);
CREATE INDEX idx_job_logs_job_id ON job_logs(job_id);
CREATE INDEX idx_message_analytics_workspace_date ON message_analytics(workspace_id, date);