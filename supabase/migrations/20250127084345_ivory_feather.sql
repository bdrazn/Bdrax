/*
  # Add mailing address to properties and profiles

  1. Changes
    - Add mailing_address column to properties table
    - Add mailing_address column to profiles table
  
  2. Notes
    - Mailing address is optional for both tables
    - Used for tracking owner contact information
*/

-- Add mailing_address to properties
ALTER TABLE properties
ADD COLUMN mailing_address text;

-- Add mailing_address to profiles
ALTER TABLE profiles
ADD COLUMN mailing_address text;