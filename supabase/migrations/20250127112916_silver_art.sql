-- Add phone number fields to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS phone_number_1 text,
ADD COLUMN IF NOT EXISTS phone_number_2 text,
ADD COLUMN IF NOT EXISTS phone_number_3 text,
ADD COLUMN IF NOT EXISTS phone_number_4 text,
ADD COLUMN IF NOT EXISTS phone_number_selection text CHECK (phone_number_selection IN ('sequential', 'random')) DEFAULT 'sequential';

-- Create function to validate phone numbers
CREATE OR REPLACE FUNCTION validate_phone_number()
RETURNS trigger AS $$
BEGIN
  -- Basic phone number validation (can be enhanced based on requirements)
  IF NEW.phone_number_1 IS NOT NULL AND NEW.phone_number_1 !~ '^\+?[1-9]\d{1,14}$' THEN
    RAISE EXCEPTION 'Invalid phone number format for phone_number_1';
  END IF;
  
  IF NEW.phone_number_2 IS NOT NULL AND NEW.phone_number_2 !~ '^\+?[1-9]\d{1,14}$' THEN
    RAISE EXCEPTION 'Invalid phone number format for phone_number_2';
  END IF;
  
  IF NEW.phone_number_3 IS NOT NULL AND NEW.phone_number_3 !~ '^\+?[1-9]\d{1,14}$' THEN
    RAISE EXCEPTION 'Invalid phone number format for phone_number_3';
  END IF;
  
  IF NEW.phone_number_4 IS NOT NULL AND NEW.phone_number_4 !~ '^\+?[1-9]\d{1,14}$' THEN
    RAISE EXCEPTION 'Invalid phone number format for phone_number_4';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for phone number validation
DROP TRIGGER IF EXISTS validate_phone_numbers ON user_settings;
CREATE TRIGGER validate_phone_numbers
  BEFORE INSERT OR UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION validate_phone_number();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_settings_phone_1 ON user_settings(phone_number_1);
CREATE INDEX IF NOT EXISTS idx_user_settings_phone_2 ON user_settings(phone_number_2);
CREATE INDEX IF NOT EXISTS idx_user_settings_phone_3 ON user_settings(phone_number_3);
CREATE INDEX IF NOT EXISTS idx_user_settings_phone_4 ON user_settings(phone_number_4);