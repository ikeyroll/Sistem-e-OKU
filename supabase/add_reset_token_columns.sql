-- Add reset token columns to admin_users table for password reset functionality
-- Run this in Supabase SQL Editor if table already exists

-- Add reset_token column
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS reset_token TEXT;

-- Add reset_token_expiry column
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP WITH TIME ZONE;

-- Create index on reset_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_reset_token ON admin_users(reset_token);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'admin_users'
ORDER BY ordinal_position;
