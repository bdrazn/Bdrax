/*
  # Add sample data

  1. Sample Data
    - Properties
    - Message Templates
    - Campaigns
    - Analytics
*/

-- Create a function to get a sample user ID
CREATE OR REPLACE FUNCTION get_sample_user_id()
RETURNS uuid AS $$
BEGIN
  -- Try to get an existing user, or create a new one if none exists
  RETURN (
    SELECT id FROM auth.users 
    ORDER BY created_at 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;

-- Insert sample properties
INSERT INTO properties (
  id, workspace_id, address, city, state, zip, property_type,
  bedrooms, bathrooms, square_feet, lot_size, year_built,
  last_sale_date, last_sale_price, estimated_value, status
) VALUES
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    (SELECT id FROM workspaces ORDER BY created_at LIMIT 1),
    '123 Main St',
    'Austin',
    'TX',
    '78701',
    'Single Family',
    3,
    2,
    2000,
    0.25,
    1985,
    '2020-01-15',
    350000,
    425000,
    'active'
  ),
  (
    'a47ac10b-58cc-4372-a567-0e02b2c3d480',
    (SELECT id FROM workspaces ORDER BY created_at LIMIT 1),
    '456 Oak Ave',
    'Austin',
    'TX',
    '78702',
    'Multi Family',
    6,
    4,
    3500,
    0.5,
    1975,
    '2019-11-20',
    550000,
    725000,
    'active'
  ),
  (
    'b47ac10b-58cc-4372-a567-0e02b2c3d481',
    (SELECT id FROM workspaces ORDER BY created_at LIMIT 1),
    '789 Pine Rd',
    'Austin',
    'TX',
    '78703',
    'Single Family',
    4,
    3,
    2800,
    0.3,
    1995,
    '2021-03-10',
    475000,
    525000,
    'pending'
  );

-- Insert sample message templates
INSERT INTO message_templates (
  id, workspace_id, name, content, delivery_strategy
) VALUES
  (
    '47ac10b5-58cc-4372-a567-0e02b2c3d484',
    (SELECT id FROM workspaces ORDER BY created_at LIMIT 1),
    'Initial Contact',
    'Hi {{name}}, I noticed you own the property at {{address}}. Would you be interested in discussing a potential offer?',
    'sequential'
  ),
  (
    '47ac10b5-58cc-4372-a567-0e02b2c3d485',
    (SELECT id FROM workspaces ORDER BY created_at LIMIT 1),
    'Follow Up',
    'Hi {{name}}, just following up on my previous message about {{address}}. Have you given it any thought?',
    'random'
  );

-- Insert sample campaigns
INSERT INTO bulk_message_campaigns (
  id, workspace_id, name, template_id, status, target_list, is_automated
) VALUES
  (
    '47ac10b5-58cc-4372-a567-0e02b2c3d486',
    (SELECT id FROM workspaces ORDER BY created_at LIMIT 1),
    'Q1 2025 Outreach',
    '47ac10b5-58cc-4372-a567-0e02b2c3d484',
    'running',
    jsonb_build_object(
      'zip_codes', ARRAY['78701', '78702', '78703'],
      'property_type', 'Single Family'
    ),
    true
  ),
  (
    '47ac10b5-58cc-4372-a567-0e02b2c3d487',
    (SELECT id FROM workspaces ORDER BY created_at LIMIT 1),
    'Multi-Family Focus',
    '47ac10b5-58cc-4372-a567-0e02b2c3d485',
    'scheduled',
    jsonb_build_object(
      'property_type', 'Multi Family',
      'min_units', 4
    ),
    true
  );

-- Insert sample message jobs
INSERT INTO message_jobs (
  id, workspace_id, campaign_id, status, total_messages, processed_messages
) VALUES
  (
    '47ac10b5-58cc-4372-a567-0e02b2c3d488',
    (SELECT id FROM workspaces ORDER BY created_at LIMIT 1),
    '47ac10b5-58cc-4372-a567-0e02b2c3d486',
    'running',
    100,
    45
  );

-- Insert sample job logs
INSERT INTO job_logs (
  job_id, event_type, message
) VALUES
  (
    '47ac10b5-58cc-4372-a567-0e02b2c3d488',
    'start',
    'Campaign started successfully'
  ),
  (
    '47ac10b5-58cc-4372-a567-0e02b2c3d488',
    'pause',
    'Daily message limit reached'
  );

-- Insert sample analytics
INSERT INTO message_analytics (
  workspace_id, date, messages_sent, messages_delivered,
  responses_received, interested_count, not_interested_count
) VALUES
  (
    (SELECT id FROM workspaces ORDER BY created_at LIMIT 1),
    CURRENT_DATE,
    145,
    142,
    23,
    8,
    15
  );

-- Update user settings with default messaging configuration
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT get_sample_user_id() INTO v_user_id;
  
  INSERT INTO user_settings (
    user_id, smrtphone_api_key, smrtphone_webhook_url,
    daily_message_limit, message_window_start, message_window_end
  ) VALUES (
    v_user_id,
    'sk_test_sample_key',
    'https://api.example.com/webhook',
    200,
    '08:00:00',
    '21:00:00'
  ) ON CONFLICT (user_id) 
  DO UPDATE SET
    smrtphone_api_key = EXCLUDED.smrtphone_api_key,
    smrtphone_webhook_url = EXCLUDED.smrtphone_webhook_url,
    daily_message_limit = EXCLUDED.daily_message_limit,
    message_window_start = EXCLUDED.message_window_start,
    message_window_end = EXCLUDED.message_window_end;
END $$;