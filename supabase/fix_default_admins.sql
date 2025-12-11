-- Fix Default Admin Accounts
-- Run this in Supabase SQL Editor to reset admin accounts with correct password hashes

-- Step 1: Delete existing admin accounts
DELETE FROM admin_users WHERE username IN ('admin', 'boss');

-- Step 2: Insert new admin accounts with correct password hashes
-- Password hashes are generated using the simpleHash function:
-- admin password: mphs2025 -> hash: -1fvhwu
-- boss password: boss2025 -> hash: -1g1fhk

INSERT INTO admin_users (username, password_hash, role, full_name, email, is_active)
VALUES 
  ('admin', '-1fvhwu', 'admin', 'Admin MPHS', 'admin@mphs.gov.my', true),
  ('boss', '-1g1fhk', 'admin_boss', 'Admin Boss MPHS', 'boss@mphs.gov.my', true)
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Step 3: Verify the accounts were created
SELECT 
  username, 
  password_hash, 
  role, 
  full_name, 
  email, 
  is_active,
  created_at
FROM admin_users 
WHERE username IN ('admin', 'boss')
ORDER BY username;

-- Expected output:
-- username | password_hash | role        | full_name        | email              | is_active
-- admin    | -1fvhwu       | admin       | Admin MPHS       | admin@mphs.gov.my  | true
-- boss     | -1g1fhk       | admin_boss  | Admin Boss MPHS  | boss@mphs.gov.my   | true
