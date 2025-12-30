-- Update generate_no_siri function to use 3 digits instead of 4
-- This changes the format from MPHS/2025/0001 to MPHS/2025/001

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
  
  -- Format: PREFIX/YEAR/NUMBER (e.g., MPHS/2025/001) - Changed from 4 to 3 digits
  v_no_siri := v_prefix || '/' || p_year::text || '/' || LPAD(v_sequence::text, 3, '0');
  
  RETURN v_no_siri;
END;
$$;
