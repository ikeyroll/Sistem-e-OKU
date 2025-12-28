-- Fix duplicate No. Siri issue when reverting approved applications
-- The problem: COUNT(*) + 1 doesn't account for gaps when applications are reverted
-- The solution: Find the smallest available number (reuse reverted numbers)

DROP FUNCTION IF EXISTS generate_no_siri(integer);

CREATE OR REPLACE FUNCTION generate_no_siri(p_year integer)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix text;
  v_next_sequence integer;
  v_no_siri text;
  v_existing_sequences integer[];
  v_i integer;
BEGIN
  -- Get the prefix for this year (default to 'MPHS' if not set)
  SELECT COALESCE(prefix, 'MPHS') INTO v_prefix
  FROM session_settings
  WHERE year = p_year;
  
  -- If no settings exist for this year, use default prefix
  IF v_prefix IS NULL THEN
    v_prefix := 'MPHS';
  END IF;
  
  -- Get all existing sequence numbers for this year (sorted)
  SELECT ARRAY_AGG(
    SUBSTRING(no_siri FROM '[0-9]+$')::integer ORDER BY SUBSTRING(no_siri FROM '[0-9]+$')::integer
  ) INTO v_existing_sequences
  FROM applications
  WHERE no_siri LIKE v_prefix || '/' || p_year::text || '/%'
    AND no_siri IS NOT NULL
    AND no_siri ~ ('^' || v_prefix || '/' || p_year::text || '/[0-9]+$');
  
  -- If no existing sequences, start from 1
  IF v_existing_sequences IS NULL OR array_length(v_existing_sequences, 1) IS NULL THEN
    v_next_sequence := 1;
  ELSE
    -- Find the first gap in the sequence (reuse reverted numbers)
    v_next_sequence := 1;
    FOR v_i IN 1..array_length(v_existing_sequences, 1) LOOP
      IF v_existing_sequences[v_i] = v_next_sequence THEN
        v_next_sequence := v_next_sequence + 1;
      ELSE
        -- Found a gap, use this number
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  -- Format: PREFIX/YEAR/NUMBER (e.g., MPHS/2025/0001)
  v_no_siri := v_prefix || '/' || p_year::text || '/' || LPAD(v_next_sequence::text, 4, '0');
  
  RETURN v_no_siri;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_no_siri(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_no_siri(integer) TO anon;
