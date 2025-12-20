-- Make ref_no column nullable since it will be generated dynamically for display only
-- This migration allows ref_no to be NULL in the database

-- Alter the applications table to make ref_no nullable
ALTER TABLE applications 
ALTER COLUMN ref_no DROP NOT NULL;

-- Add a comment to document this change
COMMENT ON COLUMN applications.ref_no IS 'Optional reference number - now generated dynamically for display based on submitted_date order. Format: OKU0000001';

-- Note: Existing data with ref_no values will remain unchanged
-- New applications can be inserted without ref_no
