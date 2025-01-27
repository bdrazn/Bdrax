/*
  # Workspace, Property, and Message Tracking System

  1. New Tables
    - `workspaces`
      - Organizational units for managing properties and users
    - `workspace_users`
      - Links users to workspaces
    - `properties`
      - Property listings with detailed information
    - `message_threads`
      - Conversation threads with property owners
    - `messages`
      - Individual messages in threads
    - `property_status_history`
      - Historical status changes for properties
    - `owner_property_relations`
      - Tracks property ownership status

  2. Security
    - Enable RLS on all tables
    - Add policies for workspace access
*/

-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create workspace_users table
CREATE TABLE IF NOT EXISTS workspace_users (
  workspace_id uuid REFERENCES workspaces(id),
  user_id uuid REFERENCES auth.users(id),
  role text CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip text NOT NULL,
  property_type text,
  bedrooms integer,
  bathrooms numeric,
  square_feet numeric,
  lot_size numeric,
  year_built integer,
  last_sale_date date,
  last_sale_price numeric,
  estimated_value numeric,
  status text CHECK (status IN ('active', 'pending', 'sold', 'off_market')) DEFAULT 'active',
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, address, city, state, zip)
);

-- Add message_threads table
CREATE TABLE IF NOT EXISTS message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  property_id uuid REFERENCES properties(id),
  owner_id uuid REFERENCES profiles(id),
  status text CHECK (status IN ('interested', 'not_interested', 'dnc')) DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES message_threads(id),
  sender_id uuid REFERENCES profiles(id),
  content text NOT NULL,
  ai_analysis jsonb DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add property_status_history table
CREATE TABLE IF NOT EXISTS property_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id),
  status text CHECK (status IN ('interested', 'not_interested', 'dnc')) NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Add owner_property_relations table
CREATE TABLE IF NOT EXISTS owner_property_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id),
  property_id uuid REFERENCES properties(id),
  status text CHECK (status IN ('current_owner', 'previous_owner', 'sold', 'unknown')) NOT NULL DEFAULT 'unknown',
  verified_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(owner_id, property_id)
);

-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_property_relations ENABLE ROW LEVEL SECURITY;

-- Workspace policies
CREATE POLICY "Users can view their workspaces"
  ON workspaces FOR SELECT
  USING (id IN (
    SELECT workspace_id FROM workspace_users
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Workspace users policies
CREATE POLICY "Users can view members in their workspaces"
  ON workspace_users FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_users
    WHERE user_id = auth.uid()
  ));

-- Properties policies
CREATE POLICY "Users can view properties in their workspaces"
  ON properties FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_users
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage properties in their workspaces"
  ON properties FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_users
    WHERE user_id = auth.uid()
  ))
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_users
    WHERE user_id = auth.uid()
  ));

-- Message threads policies
CREATE POLICY "Users can view message threads in their workspace"
  ON message_threads FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_users
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage message threads in their workspace"
  ON message_threads FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_users
    WHERE user_id = auth.uid()
  ))
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_users
    WHERE user_id = auth.uid()
  ));

-- Messages policies
CREATE POLICY "Users can view messages in their workspace threads"
  ON messages FOR SELECT
  USING (thread_id IN (
    SELECT id FROM message_threads
    WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_users
      WHERE user_id = auth.uid()
    )
  ));

-- Property status history policies
CREATE POLICY "Users can view status history in their workspaces"
  ON property_status_history FOR SELECT
  USING (property_id IN (
    SELECT id FROM properties
    WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_users
      WHERE user_id = auth.uid()
    )
  ));

-- Owner property relations policies
CREATE POLICY "Users can view owner relations in their workspaces"
  ON owner_property_relations FOR SELECT
  USING (property_id IN (
    SELECT id FROM properties
    WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_users
      WHERE user_id = auth.uid()
    )
  ));

-- Function to create default workspace for new users
CREATE OR REPLACE FUNCTION create_default_workspace()
RETURNS trigger AS $$
BEGIN
  -- Create default workspace
  INSERT INTO workspaces (name, created_by)
  VALUES ('My Workspace', NEW.id)
  RETURNING id INTO NEW.default_workspace_id;
  
  -- Add user to workspace
  INSERT INTO workspace_users (workspace_id, user_id, role)
  VALUES (NEW.default_workspace_id, NEW.id, 'admin');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user workspace creation
CREATE OR REPLACE TRIGGER on_auth_user_create_workspace
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_workspace();