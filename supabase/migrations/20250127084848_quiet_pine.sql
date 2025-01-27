/*
  # Add business name and contact identification

  1. Changes
    - Add business_name, first_name, last_name to profiles
    - Add phone_number_hash column for identification
    - Add trigger to maintain phone number hash
    - Add unique constraint for contact identification
  
  2. Notes
    - Uses a computed hash column instead of function-based index
    - Maintains data integrity with triggers
*/

-- Add new columns
ALTER TABLE profiles
ADD COLUMN business_name text,
ADD COLUMN first_name text,
ADD COLUMN last_name text,
ADD COLUMN phone_number_hash text;

-- Create function to hash phone number (marked as IMMUTABLE)
CREATE OR REPLACE FUNCTION hash_phone_number(phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(sha256(COALESCE(phone, '')::bytea), 'hex')
$$;

-- Create function to get first phone number
CREATE OR REPLACE FUNCTION get_contact_first_phone(profile_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  first_number text;
BEGIN
  SELECT number INTO first_number
  FROM phone_numbers
  WHERE owner_id = profile_id
  ORDER BY created_at ASC
  LIMIT 1;
  
  RETURN first_number;
END;
$$;

-- Create function to update phone number hash
CREATE OR REPLACE FUNCTION update_phone_number_hash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the hash in profiles table
  UPDATE profiles
  SET phone_number_hash = hash_phone_number(get_contact_first_phone(NEW.owner_id))
  WHERE id = NEW.owner_id;
  
  RETURN NEW;
END;
$$;

-- Create triggers for phone numbers
CREATE TRIGGER phone_number_hash_insert_trigger
  AFTER INSERT ON phone_numbers
  FOR EACH ROW
  EXECUTE FUNCTION update_phone_number_hash();

CREATE TRIGGER phone_number_hash_update_trigger
  AFTER UPDATE ON phone_numbers
  FOR EACH ROW
  EXECUTE FUNCTION update_phone_number_hash();

CREATE TRIGGER phone_number_hash_delete_trigger
  AFTER DELETE ON phone_numbers
  FOR EACH ROW
  EXECUTE FUNCTION update_phone_number_hash();

-- Create unique index for contact identification
CREATE UNIQUE INDEX idx_profiles_contact_identification
ON profiles (first_name, last_name, phone_number_hash)
WHERE first_name IS NOT NULL 
  AND last_name IS NOT NULL 
  AND phone_number_hash IS NOT NULL;

-- Create function to check for duplicates
CREATE OR REPLACE FUNCTION check_contact_duplicate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update phone number hash
  NEW.phone_number_hash := hash_phone_number(get_contact_first_phone(NEW.id));
  
  -- Check for duplicates
  IF EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.first_name = NEW.first_name
    AND p.last_name = NEW.last_name
    AND p.phone_number_hash = NEW.phone_number_hash
    AND p.id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Contact with same name and phone number already exists';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for duplicate checking
CREATE TRIGGER check_contact_duplicate_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_contact_duplicate();

-- Update existing records
DO $$
BEGIN
  -- Update phone number hashes for existing records
  UPDATE profiles p
  SET phone_number_hash = hash_phone_number(
    (SELECT number 
     FROM phone_numbers pn 
     WHERE pn.owner_id = p.id 
     ORDER BY created_at ASC 
     LIMIT 1)
  );
  
  -- Split existing full_name into first_name and last_name
  UPDATE profiles
  SET 
    first_name = split_part(full_name, ' ', 1),
    last_name = CASE 
      WHEN array_length(string_to_array(full_name, ' '), 1) > 1 
      THEN array_to_string((string_to_array(full_name, ' '))[2:], ' ')
      ELSE ''
    END
  WHERE full_name IS NOT NULL AND first_name IS NULL;
END $$;