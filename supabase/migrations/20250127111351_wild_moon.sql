-- Add campaign_id to message_threads
ALTER TABLE message_threads
ADD COLUMN campaign_id uuid REFERENCES bulk_message_campaigns(id);

-- Add index for performance
CREATE INDEX idx_message_threads_campaign_id ON message_threads(campaign_id);