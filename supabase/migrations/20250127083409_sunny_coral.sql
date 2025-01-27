/*
  # Add Sample Message Templates

  1. New Data
    - Sample message templates for common real estate scenarios
    - Templates include merge fields for personalization
    - Mix of initial contact and follow-up templates

  2. Changes
    - Inserts sample templates into message_templates table
    - Each template has a specific purpose and use case
*/

-- Insert sample message templates
INSERT INTO message_templates (
  id, 
  workspace_id,
  name,
  content,
  delivery_strategy
) VALUES
  -- Initial Contact Templates
  (
    gen_random_uuid(),
    (SELECT id FROM workspaces ORDER BY created_at LIMIT 1),
    'Initial Contact - General',
    'Hi {{name}}, I noticed you own the property at {{address}}. I''m interested in discussing a potential offer. Would you be open to a conversation?',
    'sequential'
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM workspaces ORDER BY created_at LIMIT 1),
    'Initial Contact - Cash Offer',
    'Hello {{name}}, I''m reaching out about your property at {{address}}. I''m an investor looking to make a cash offer with a quick closing. Would this interest you?',
    'sequential'
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM workspaces ORDER BY created_at LIMIT 1),
    'Initial Contact - Multi-Family',
    'Hi {{name}}, I specialize in multi-family properties and noticed your building at {{address}}. I''d love to discuss potential opportunities if you''re open to it.',
    'sequential'
  ),
  -- Follow-up Templates
  (
    gen_random_uuid(),
    (SELECT id FROM workspaces ORDER BY created_at LIMIT 1),
    'Follow Up - Gentle Reminder',
    'Hi {{name}}, just following up about your property at {{address}}. I''m still interested in discussing options if you have a moment.',
    'random'
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM workspaces ORDER BY created_at LIMIT 1),
    'Follow Up - Market Update',
    'Hello {{name}}, I wanted to share that property values in the {{address}} area have been increasing. Would you like to discuss what your property might be worth in today''s market?',
    'random'
  ),
  -- Special Situation Templates
  (
    gen_random_uuid(),
    (SELECT id FROM workspaces ORDER BY created_at LIMIT 1),
    'Distressed Property',
    'Hi {{name}}, I understand managing repairs at {{address}} might be challenging. I buy properties as-is and can close quickly. Would you like to explore options?',
    'sequential'
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM workspaces ORDER BY created_at LIMIT 1),
    'Absentee Owner',
    'Hello {{name}}, I noticed you don''t live at {{address}}. If managing a remote property is becoming difficult, I''d be happy to discuss solutions that could work for you.',
    'sequential'
  ),
  -- Seasonal Templates
  (
    gen_random_uuid(),
    (SELECT id FROM workspaces ORDER BY created_at LIMIT 1),
    'End of Year',
    'Hi {{name}}, as the year ends, many property owners are looking to sell before January. If you''ve considered selling {{address}}, I can help you close quickly.',
    'sequential'
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM workspaces ORDER BY created_at LIMIT 1),
    'Spring Market',
    'Hello {{name}}, spring is traditionally the best time to sell. If you''ve thought about selling {{address}}, I''d be happy to discuss the current market value.',
    'sequential'
  ),
  -- Response Templates
  (
    gen_random_uuid(),
    (SELECT id FROM workspaces ORDER BY created_at LIMIT 1),
    'Positive Response Follow-up',
    'Thanks for your interest, {{name}}. Would you prefer to discuss {{address}} over phone or text? I''m available at your convenience.',
    'sequential'
  );