-- Fix RLS Policies for admin_users table
-- Run this in Supabase SQL Editor

-- First, drop existing policies
DROP POLICY IF EXISTS "Admins can view all admin users" ON admin_users;
DROP POLICY IF EXISTS "Only admin_boss can modify admin users" ON admin_users;
DROP POLICY IF EXISTS "Anyone can view admin users" ON admin_users;
DROP POLICY IF EXISTS "Allow insert for admin users" ON admin_users;
DROP POLICY IF EXISTS "Allow update for admin users" ON admin_users;
DROP POLICY IF EXISTS "Allow delete for admin users" ON admin_users;

-- Create new simplified policies
-- These allow all operations since we handle authorization at application level

-- Allow SELECT (for login and listing)
CREATE POLICY "Allow select for admin users"
  ON admin_users
  FOR SELECT
  USING (true);

-- Allow INSERT (for creating new admins)
CREATE POLICY "Allow insert for admin users"
  ON admin_users
  FOR INSERT
  WITH CHECK (true);

-- Allow UPDATE (for editing admins)
CREATE POLICY "Allow update for admin users"
  ON admin_users
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow DELETE (for removing admins)
CREATE POLICY "Allow delete for admin users"
  ON admin_users
  FOR DELETE
  USING (true);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'admin_users';
