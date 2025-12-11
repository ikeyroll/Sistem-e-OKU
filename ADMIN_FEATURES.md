# Admin Features Documentation

## Overview
This document outlines the new admin features implemented in the MPHS OKU Sticker Digital Workflow system.

## 1. Role-Based Authentication

### Admin Roles
The system now supports two types of admin users:

1. **Admin** - Standard admin with access to:
   - View and manage applications
   - Approve/reject applications
   - Download CSV exports
   - Download KML files
   - Toggle dashboard section visibility

2. **Admin Boss** - Super admin with all Admin privileges plus:
   - Create new admin accounts
   - Edit existing admin accounts
   - Delete admin accounts
   - Activate/deactivate admin accounts
   - Change admin roles

### Default Accounts
Two default accounts are created automatically:

| Username | Password | Role |
|----------|----------|------|
| `admin` | `mphs2025` | admin |
| `boss` | `boss2025` | admin_boss |

**Important**: Change these passwords in production!

## 2. Dashboard Visibility Toggle

### Feature Description
Admins and Admin Boss can toggle the visibility of dashboard sections independently.

### Toggleable Sections
1. Jumlah Permohonan (Total Applications)
2. Permohonan Berjaya (Successful Applications)
3. Dalam Proses (In Progress)
4. Peta Interaktif (Interactive Map)
5. Trend Bulanan (Monthly Trend)
6. Permohonan Mengikut Mukim (Applications by Mukim)
7. Status Permohonan (Application Status)

### Access
- Only users logged in as `admin` or `admin_boss` can see the Settings button
- Public users cannot toggle dashboard sections
- Settings are session-based (not persisted)

## 3. KML Download Feature

### Feature Description
Admins can download map data in KML format for use in Google Earth or other mapping applications.

### Filters Available
1. **Session Filter** - Filter by 2-year session period (e.g., 2023/2025)
2. **Mukim Filter** - Filter by specific mukim area

### File Naming Convention
Downloaded files follow this pattern:
- All data: `peta-interaktif.kml`
- With session: `peta-interaktif-2023-2025.kml`
- With mukim: `peta-interaktif-Batang-Kali.kml`
- Both filters: `peta-interaktif-2023-2025-Batang-Kali.kml`

### Data Included
- Application reference number
- Applicant name and IC
- Application type
- Address
- GPS coordinates (latitude/longitude)
- Grouped by Daerah and Mukim

## 4. Admin Management Page

### Access
- URL: `/admin/manage-admins`
- Only accessible by users with `admin_boss` role
- Redirects to admin panel if accessed by standard admin

### Features

#### Create Admin
- Username (unique, required)
- Password (required for new accounts)
- Full Name (required)
- Email (optional)
- Role (admin or admin_boss)
- Active status (default: true)

#### Edit Admin
- Update full name
- Update email
- Change role
- Change password (optional - leave blank to keep existing)
- Toggle active status

#### Delete Admin
- Permanently remove admin account
- Confirmation required

#### Toggle Status
- Quickly activate/deactivate admin accounts
- Deactivated accounts cannot log in

## 5. Database Schema

### admin_users Table
```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'admin_boss')),
  full_name TEXT NOT NULL,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

### Indexes
- `idx_admin_users_username` - Fast username lookups
- `idx_admin_users_role` - Role-based queries

### Row Level Security (RLS)
- All admins can view admin users
- Only admin_boss can create/update/delete admin users

## 6. API Functions

### Authentication
- `loginAdmin(username, password)` - Authenticate admin user
- Returns: `{ success, user, role }`

### Admin Management (Admin Boss Only)
- `getAllAdmins()` - Get all admin users
- `createAdmin(adminData)` - Create new admin
- `updateAdmin(id, updates)` - Update admin details
- `deleteAdmin(id)` - Delete admin account
- `toggleAdminStatus(id, isActive)` - Activate/deactivate admin

### Initialization
- `initializeDefaultAdmins()` - Create default admin accounts if none exist

## 7. Security Considerations

### Password Hashing
- Simple hash function used for demo purposes
- **Production**: Replace with bcrypt, argon2, or similar
- Hash function located in: `src/lib/api/auth.ts`

### Session Management
- Admin credentials stored in localStorage
- Role stored separately for quick access
- Cookie-based session tracking
- Logout clears all session data

### Access Control
- Route-level protection (redirects to login)
- Role-based UI elements (conditional rendering)
- Database-level RLS policies

## 8. Usage Guide

### For Admin Boss

#### Managing Admins
1. Log in with admin_boss credentials
2. Click "Urus Admin" button in admin panel
3. View list of all admins
4. Use action buttons to:
   - Edit admin details
   - Toggle active status
   - Delete admin

#### Creating New Admin
1. Click "Tambah Admin" button
2. Fill in required fields:
   - Username
   - Password
   - Full Name
   - Role
3. Optionally add email
4. Click "Tambah" to create

### For All Admins

#### Downloading KML
1. Go to admin panel
2. Scroll to "Muat Turun Peta Interaktif (KML)" section
3. Select filters:
   - Session (optional)
   - Mukim (optional)
4. Click "Muat Turun KML"
5. File downloads automatically

#### Toggling Dashboard Visibility
1. Go to dashboard page
2. Click Settings icon (gear) next to session selector
3. Toggle switches for each section
4. Changes apply immediately
5. Settings reset on page refresh

## 9. File Structure

```
src/
├── app/
│   ├── admin/
│   │   ├── login/page.tsx          # Updated with role-based auth
│   │   ├── manage-admins/page.tsx  # New: Admin management page
│   │   └── page.tsx                # Updated with KML download
│   └── dashboard/page.tsx          # Updated with visibility toggle
├── lib/
│   ├── api/
│   │   └── auth.ts                 # New: Authentication functions
│   └── kml.ts                      # Existing: KML generation
└── supabase/
    └── migrations/
        └── create_admin_users_table.sql  # New: Database migration
```

## 10. Future Enhancements

### Recommended Improvements
1. **Password Security**
   - Implement bcrypt or argon2 hashing
   - Add password strength requirements
   - Implement password reset functionality

2. **Session Management**
   - Add session expiry
   - Implement refresh tokens
   - Add "Remember Me" functionality

3. **Audit Logging**
   - Log all admin actions
   - Track login attempts
   - Monitor data exports

4. **Dashboard Preferences**
   - Persist visibility settings per user
   - Save to database
   - Sync across devices

5. **KML Enhancements**
   - Add more filter options (status, date range)
   - Include custom styling in KML
   - Support GPX format export

## 11. Troubleshooting

### Cannot Log In
- Verify username and password
- Check if account is active
- Ensure admin_users table exists
- Check browser console for errors

### Cannot Access Admin Management
- Verify you're logged in as admin_boss
- Check localStorage for adminRole
- Clear browser cache and re-login

### KML Download Not Working
- Ensure applications have latitude/longitude data
- Check browser console for errors
- Verify filter selections
- Try downloading without filters first

### Dashboard Toggle Not Showing
- Verify you're logged in as admin or admin_boss
- Check localStorage for adminLoggedIn and adminRole
- Refresh the page
- Clear browser cache

## 12. Support

For issues or questions:
1. Check browser console for error messages
2. Verify database migrations are applied
3. Ensure Supabase connection is working
4. Review this documentation

---

**Last Updated**: November 30, 2025
**Version**: 1.0.0
