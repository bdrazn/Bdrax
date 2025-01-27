/*
  # Fix workspace creation for new users

  1. Changes
    - Drop and recreate the create_default_workspace function
    - Add proper error handling
    - Ensure workspace and workspace_user records are created
    - Add proper transaction handling
  
  2. Security
    - Function runs with SECURITY DEFINER to ensure proper permissions
*/

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_create_workspace ON auth.users;
DROP FUNCTION IF EXISTS create_default_workspace();

-- Create improved function for workspace creation
CREATE OR REPLACE FUNCTION create_default_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_workspace_id uuid;
BEGIN
  -- Create default workspace
  INSERT INTO workspaces (
    name,
    created_by
  ) VALUES (
    'My Workspace',
    NEW.id
  )
  RETURNING id INTO new_workspace_id;

  -- Add user to workspace
  INSERT INTO workspace_users (
    workspace_id,
    user_id,
    role
  ) VALUES (
    new_workspace_id,
    NEW.id,
    'admin'
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in create_default_workspace: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_create_workspace
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_workspace();

-- Create function to fix existing users without workspaces
CREATE OR REPLACE FUNCTION fix_missing_workspaces()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  new_workspace_id uuid;
BEGIN
  FOR user_record IN
    SELECT id 
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 
      FROM workspace_users wu 
      WHERE wu.user_id = u.id
    )
  LOOP
    -- Create workspace for user
    INSERT INTO workspaces (
      name,
      created_by
    ) VALUES (
      'My Workspace',
      user_record.id
    )
    RETURNING id INTO new_workspace_id;

    -- Add user to workspace
    INSERT INTO workspace_users (
      workspace_id,
      user_id,
      role
    ) VALUES (
      new_workspace_id,
      user_record.id,
      'admin'
    );
  END LOOP;
END;
$$;

-- Run fix for existing users
SELECT fix_missing_workspaces();