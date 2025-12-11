-- Create admin_users table for role-based authentication
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'admin_boss')),
  full_name TEXT NOT NULL,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  reset_token TEXT,
  reset_token_expiry TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);

-- Create index on role
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- Enable Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read admin users (for login)
CREATE POLICY "Anyone can view admin users"
  ON admin_users
  FOR SELECT
  USING (true);

-- Create policy to allow insert (for initial setup and admin creation)
CREATE POLICY "Allow insert for admin users"
  ON admin_users
  FOR INSERT
  WITH CHECK (true);

-- Create policy to allow update for admin users
CREATE POLICY "Allow update for admin users"
  ON admin_users
  FOR UPDATE
  USING (true);

-- Create policy to allow delete for admin users
CREATE POLICY "Allow delete for admin users"
  ON admin_users
  FOR DELETE
  USING (true);

-- Insert default admin accounts
-- Note: Password hashes are for 'mphs2025' and 'boss2025' respectively
-- These are simple hashes for demo purposes. In production, use bcrypt or similar.
INSERT INTO admin_users (username, password_hash, role, full_name, email, is_active)
VALUES 
  ('admin', '-1fvhwu', 'admin', 'Admin MPHS', 'admin@mphs.gov.my', true),
  ('boss', '-1g1fhk', 'admin_boss', 'Admin Boss MPHS', 'boss@mphs.gov.my', true)
ON CONFLICT (username) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_updated_at();

COMMENT ON TABLE admin_users IS 'Stores admin user accounts with role-based access control';
COMMENT ON COLUMN admin_users.role IS 'User role: admin (standard admin) or admin_boss (can manage other admins)';
COMMENT ON COLUMN admin_users.password_hash IS 'Hashed password for authentication';
COMMENT ON COLUMN admin_users.is_active IS 'Whether the admin account is active and can log in';
