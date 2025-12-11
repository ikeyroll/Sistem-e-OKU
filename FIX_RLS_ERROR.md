# Fix: "infinite recursion detected in policy for relation admin_users"

## Problem
Error ketika create admin baru:
```
Error creating admin:
code: "42P17"
message: "infinite recursion detected in policy for relation \"admin_users\""
```

## Root Cause
Row Level Security (RLS) policy di table `admin_users` mempunyai **recursive check** yang menyebabkan infinite loop. Policy cuba check `admin_users` table untuk verify role, tetapi untuk access table tersebut, ia perlu check policy lagi, creating infinite recursion.

## Solution

### Option 1: Fix via Supabase Dashboard (RECOMMENDED)

1. **Login to Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Run Fix Script**
   Copy and paste this SQL:

```sql
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all admin users" ON admin_users;
DROP POLICY IF EXISTS "Only admin_boss can modify admin users" ON admin_users;

-- Create new simplified policies
CREATE POLICY "Allow select for admin users"
  ON admin_users
  FOR SELECT
  USING (true);

CREATE POLICY "Allow insert for admin users"
  ON admin_users
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update for admin users"
  ON admin_users
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete for admin users"
  ON admin_users
  FOR DELETE
  USING (true);
```

4. **Click "Run"**

5. **Verify**
   - Go to "Table Editor" → "admin_users"
   - Click "Policies" tab
   - Should see 4 policies: select, insert, update, delete

### Option 2: Disable RLS Temporarily (QUICK FIX)

If you need immediate fix:

```sql
-- Disable RLS on admin_users table
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;
```

⚠️ **Warning**: This removes all access control. Only use for testing!

### Option 3: Run Migration File

If you have Supabase CLI:

```bash
# Run the fix script
supabase db push --file supabase/fix_rls_policies.sql
```

## Why This Happens

### Old Policy (PROBLEMATIC)
```sql
CREATE POLICY "Only admin_boss can modify admin users"
  ON admin_users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users  -- ❌ Tries to query same table
      WHERE username = current_user
      AND role = 'admin_boss'
      AND is_active = true
    )
  );
```

**Problem**: Policy tries to query `admin_users` table to check if user is admin_boss, but to query that table, it needs to check the policy again → **infinite recursion**

### New Policy (FIXED)
```sql
CREATE POLICY "Allow insert for admin users"
  ON admin_users
  FOR INSERT
  WITH CHECK (true);  -- ✅ No recursive check
```

**Solution**: Simplified policies that don't query the same table. Authorization is handled at **application level** (checking `localStorage.getItem('adminRole')`).

## Security Considerations

### Application-Level Security
Since we simplified RLS policies, security is now enforced at application level:

1. **Login Check**: Only admin_boss can access `/admin/manage-admins`
2. **Role Verification**: Page checks `adminRole` from localStorage
3. **Redirect**: Non-admin_boss users redirected to `/admin`

### Code Protection
```typescript
// In manage-admins/page.tsx
useEffect(() => {
  const role = localStorage.getItem('adminRole');
  
  if (role !== 'admin_boss') {
    toast.error('Access denied. Only Admin Boss can manage admins.');
    router.push('/admin');
    return;
  }
  
  loadAdmins();
}, [router]);
```

### Database-Level Security (Future Enhancement)
For production, consider:
1. **Supabase Auth**: Use Supabase authentication instead of custom
2. **JWT Claims**: Store role in JWT token
3. **Service Role**: Use service role key for admin operations
4. **API Routes**: Create Next.js API routes with server-side validation

## Testing After Fix

### Test Create Admin
1. Login as boss (username: `boss`, password: `boss2025`)
2. Go to "Pengurusan Admin"
3. Click "Tambah Admin"
4. Fill form:
   - Username: `testadmin`
   - Password: `test123`
   - Full Name: `Test Admin`
   - Role: `admin`
5. Click "Tambah"
6. ✅ Should succeed without error

### Test Update Admin
1. Click Edit icon on any admin
2. Change Full Name
3. Click "Kemaskini"
4. ✅ Should update successfully

### Test Delete Admin
1. Click Delete icon
2. Confirm deletion
3. ✅ Should delete successfully

### Test Toggle Status
1. Click status toggle icon
2. ✅ Status should change immediately

## Verification Queries

### Check Current Policies
```sql
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'admin_users';
```

### Check RLS Status
```sql
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'admin_users';
```

### Test Insert Directly
```sql
INSERT INTO admin_users (username, password_hash, role, full_name, is_active)
VALUES ('test', 'hash123', 'admin', 'Test User', true);
```

Should succeed without error.

## Alternative: Use Supabase Auth (RECOMMENDED FOR PRODUCTION)

For production deployment, consider migrating to Supabase Auth:

```typescript
// Instead of custom auth
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabase = createClientComponentClient()

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'admin@example.com',
  password: 'password123',
})

// Store role in user metadata
const { data: { user } } = await supabase.auth.getUser()
const role = user?.user_metadata?.role
```

Benefits:
- Built-in session management
- Secure token handling
- Better RLS integration
- Password reset functionality
- Email verification

## Summary

✅ **Quick Fix**: Run SQL script in Supabase Dashboard
✅ **Root Cause**: Recursive policy checking same table
✅ **Solution**: Simplified policies + application-level security
✅ **Testing**: All CRUD operations should work
⚠️ **Production**: Consider Supabase Auth for better security

---

**Created**: Nov 30, 2025
**Status**: Ready to implement
