-- Create footer_settings table
CREATE TABLE IF NOT EXISTS footer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facebook_link TEXT,
  instagram_link TEXT,
  youtube_link TEXT,
  tiktok_link TEXT,
  whatsapp_link TEXT,
  asset_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default values
INSERT INTO footer_settings (
  facebook_link,
  instagram_link,
  youtube_link,
  tiktok_link,
  whatsapp_link,
  asset_number
) VALUES (
  'https://www.facebook.com/maborongmphs',
  'https://www.instagram.com/mpaborong_mphs',
  'https://www.youtube.com/@MajlisPerbandranHuluSelango',
  'https://www.tiktok.com/@mphs_official',
  'https://wa.me/60360641331',
  '1029392'
);

-- Enable RLS
ALTER TABLE footer_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access to footer settings"
ON footer_settings FOR SELECT
TO public
USING (true);

-- Create policy to allow authenticated users to update
CREATE POLICY "Allow authenticated users to update footer settings"
ON footer_settings FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create policy to allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert footer settings"
ON footer_settings FOR INSERT
TO authenticated
WITH CHECK (true);
