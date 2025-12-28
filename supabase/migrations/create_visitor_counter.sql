-- Create visitor counter table
CREATE TABLE IF NOT EXISTS visitor_stats (
  id INTEGER PRIMARY KEY DEFAULT 1,
  total_count BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert initial row
INSERT INTO visitor_stats (id, total_count)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- Function to increment visitor count
CREATE OR REPLACE FUNCTION increment_visitor_count()
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  new_count BIGINT;
BEGIN
  UPDATE visitor_stats
  SET total_count = total_count + 1,
      updated_at = NOW()
  WHERE id = 1
  RETURNING total_count INTO new_count;
  
  RETURN new_count;
END;
$$;

-- Function to get current visitor count
CREATE OR REPLACE FUNCTION get_visitor_count()
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  current_count BIGINT;
BEGIN
  SELECT total_count INTO current_count
  FROM visitor_stats
  WHERE id = 1;
  
  RETURN COALESCE(current_count, 0);
END;
$$;

-- Grant permissions
GRANT SELECT ON visitor_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_visitor_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_visitor_count() TO anon, authenticated;
