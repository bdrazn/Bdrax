-- Add missing columns to property_status_history
ALTER TABLE property_status_history
ADD COLUMN IF NOT EXISTS source text CHECK (source IN ('user', 'ai')) DEFAULT 'user',
ADD COLUMN IF NOT EXISTS confidence numeric CHECK (confidence >= 0 AND confidence <= 1),
ADD COLUMN IF NOT EXISTS reasoning text;