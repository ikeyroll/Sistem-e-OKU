-- Create session_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS session_settings (
  year INTEGER PRIMARY KEY,
  capacity INTEGER NOT NULL DEFAULT 350,
  prefix VARCHAR(10) DEFAULT 'MPHS',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add prefix column to session_settings table (if table already exists but column doesn't)
ALTER TABLE session_settings ADD COLUMN IF NOT EXISTS prefix VARCHAR(10) DEFAULT 'MPHS';

-- Update existing rows to have the default prefix
UPDATE session_settings SET prefix = 'MPHS' WHERE prefix IS NULL;

-- Insert default settings for current year if not exists
INSERT INTO session_settings (year, capacity, prefix)
VALUES (EXTRACT(YEAR FROM NOW())::INTEGER, 350, 'MPHS')
ON CONFLICT (year) DO NOTHING;

-- Drop the old function
DROP FUNCTION IF EXISTS generate_no_siri(integer);

-- Create new function that generates serial number in PREFIX/YEAR/NUMBER format
CREATE OR REPLACE FUNCTION generate_no_siri(p_year integer)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix text;
  v_sequence integer;
  v_no_siri text;
BEGIN
  -- Get the prefix for this year (default to 'MPHS' if not set)
  SELECT COALESCE(prefix, 'MPHS') INTO v_prefix
  FROM session_settings
  WHERE year = p_year;
  
  -- If no settings exist for this year, use default prefix
  IF v_prefix IS NULL THEN
    v_prefix := 'MPHS';
  END IF;
  
  -- Get the next sequence number for this year
  -- Count existing no_siri entries that start with the prefix and year
  SELECT COUNT(*) + 1 INTO v_sequence
  FROM applications
  WHERE no_siri LIKE v_prefix || '/' || p_year::text || '/%'
    AND approved_date >= (p_year || '-01-01')::date
    AND approved_date < ((p_year + 1) || '-01-01')::date;
  
  -- Format: PREFIX/YEAR/NUMBER (e.g., MPHS/2025/001)
  v_no_siri := v_prefix || '/' || p_year::text || '/' || LPAD(v_sequence::text, 3, '0');
  
  RETURN v_no_siri;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_no_siri(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_no_siri(integer) TO anon;
