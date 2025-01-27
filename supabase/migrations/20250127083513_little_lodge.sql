/*
  # Fix Profiles RLS Policies

  1. Changes
    - Drop existing profiles RLS policies
    - Create new, more permissive policies for profiles table
    - Allow users to insert their own profile
    - Allow workspace members to view profiles
    - Allow users to update their own profile

  2. Security
    - Maintains data security while allowing necessary access
    - Ensures users can only access profiles they should see
    - Preserves workspace-based access control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new policies for profiles table
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can view workspace member profiles"
  ON profiles FOR SELECT
  USING (
    id = auth.uid() OR  -- Can view own profile
    id IN (  -- Can view profiles of users in same workspaces
      SELECT user_id 
      FROM workspace_users wu
      WHERE wu.workspace_id IN (
        SELECT workspace_id 
        FROM workspace_users 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());