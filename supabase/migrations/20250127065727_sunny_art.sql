/*
  # Message Templates and API Settings Update

  1. Changes to message_templates
    - Add support for multiple messages per template
    - Add message delivery strategy
  
  2. New Settings Fields
    - API configuration
    - Message limits
*/

-- Update message_templates table
ALTER TABLE message_templates 
ADD COLUMN messages jsonb[] DEFAULT ARRAY[]::jsonb[],
ADD COLUMN delivery_strategy text CHECK (delivery_strategy IN ('sequential', 'random')) DEFAULT 'sequential';

-- Add API settings to user_settings
ALTER TABLE user_settings
ADD COLUMN smrtphone_api_key text DEFAULT NULL,
ADD COLUMN smrtphone_webhook_url text DEFAULT NULL,
ADD COLUMN daily_message_limit integer DEFAULT 100;