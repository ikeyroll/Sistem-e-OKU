-- Fix missing coordinates for existing applications
-- This script populates latitude/longitude for applications that don't have them
-- Uses the EXACT default pin location from MapPicker (3.5547, 101.6463)
-- This is the same location where MapPicker auto-pins if user doesn't change it

UPDATE applications
SET 
  latitude = 3.5547,  -- Exact default pin location from MapPicker
  longitude = 101.6463,  -- Exact default pin location from MapPicker
  daerah = COALESCE(daerah, 'Hulu Selangor'),
  mukim = COALESCE(mukim, pemohon->>'mukim', pemohon->'address'->>'mukim', '')
WHERE latitude IS NULL OR longitude IS NULL;

-- Verify the update - should show 0 still_missing after running
SELECT 
  COUNT(*) as total_applications,
  COUNT(latitude) as with_latitude,
  COUNT(longitude) as with_longitude,
  COUNT(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL) as still_missing
FROM applications;
