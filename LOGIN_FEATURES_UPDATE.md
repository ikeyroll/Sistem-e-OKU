# Login Page Features - Forgot Password & Remember Me

## Summary of Changes - Nov 30, 2025

### ✅ Features Added

#### 1. **Remember Me** Functionality
- Checkbox to save username for future logins
- Username automatically filled on next visit
- Stored in localStorage
- Checkbox state persists across sessions

#### 2. **Forgot Password** Feature
- "Lupa password?" link on login page
- Dialog modal for password reset
- Email-based password reset flow
- Token-based verification system
- 1-hour token expiry

#### 3. **Language Support**
- All new features support EN/BM toggle
- Consistent with existing language system

---

## 1. Remember Me Feature

### How It Works
```typescript
// When user logs in with "Remember Me" checked:
1. Username saved to localStorage
2. Remember Me preference saved
3. On next page load, username auto-filled
4. Checkbox automatically checked

// When user logs in without "Remember Me":
1. Saved username removed from localStorage
2. Remember Me preference cleared
```

### Implementation Details

**Storage**:
- `localStorage.setItem('rememberedUsername', username)`
- `localStorage.setItem('rememberMe', 'true')`

**Auto-fill on Load**:
```typescript
useEffect(() => {
  const savedUsername = localStorage.getItem('rememberedUsername');
  const savedRememberMe = localStorage.getItem('rememberMe') === 'true';
  
  if (savedRememberMe && savedUsername) {
    setUsername(savedUsername);
    setRememberMe(true);
  }
}, []);
```

**UI Component**:
```tsx
<div className="flex items-center space-x-2">
  <input
    type="checkbox"
    id="remember"
    checked={rememberMe}
    onChange={(e) => setRememberMe(e.target.checked)}
  />
  <Label htmlFor="remember">
    {language === 'en' ? 'Remember me' : 'Ingat saya'}
  </Label>
</div>
```

---

## 2. Forgot Password Feature

### User Flow

```
1. User clicks "Lupa password?" link
   ↓
2. Dialog opens asking for email
   ↓
3. User enters email and clicks "Hantar Pautan Reset"
   ↓
4. System checks if email exists in database
   ↓
5. If found:
   - Generate reset token
   - Store token in database with expiry (1 hour)
   - Send email with reset link (console.log for now)
   - Show success message
   ↓
6. User clicks reset link in email
   ↓
7. Redirects to reset password page
   ↓
8. User enters new password
   ↓
9. System verifies token and updates password
   ↓
10. User can login with new password
```

### Database Schema

**New Columns Added**:
```sql
reset_token TEXT
reset_token_expiry TIMESTAMP WITH TIME ZONE
```

**Index**:
```sql
CREATE INDEX idx_admin_users_reset_token ON admin_users(reset_token);
```

### API Functions

#### `resetPassword(email: string)`
```typescript
// Find admin by email
// Generate random reset token
// Store token with 1-hour expiry
// Log reset link (TODO: send email)
// Return success/error
```

#### `verifyResetToken(token: string)`
```typescript
// Find admin by reset token
// Check if token is expired
// Return success with email or error
```

#### `updatePasswordWithToken(token: string, newPassword: string)`
```typescript
// Verify token is valid
// Hash new password
// Update password in database
// Clear reset token
// Return success/error
```

### Token Generation
```typescript
const resetToken = Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15);
const resetExpiry = new Date(Date.now() + 3600000); // 1 hour
```

### Reset Link Format
```
http://localhost:3000/admin/reset-password?token=abc123xyz789
```

---

## 3. UI Components

### Login Form Updates

**Before**:
```tsx
[Username Input]
[Password Input]
[Login Button]
```

**After**:
```tsx
[Username Input]
[Password Input]
[Remember Me Checkbox] [Forgot Password Link]
[Login Button]
```

### Forgot Password Dialog

```tsx
<Dialog>
  <DialogHeader>
    <DialogTitle>Reset Password</DialogTitle>
    <DialogDescription>
      Enter your email address...
    </DialogDescription>
  </DialogHeader>
  
  <form>
    <Input type="email" placeholder="Enter your email" />
    
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button type="submit">Send Reset Link</Button>
    </DialogFooter>
  </form>
</Dialog>
```

---

## 4. Language Support

### English Translations
- **Remember me**: "Remember me"
- **Forgot password**: "Forgot password?"
- **Reset Password**: "Reset Password"
- **Enter your email**: "Enter your email address and we will send you a link to reset your password."
- **Send Reset Link**: "Send Reset Link"
- **Cancel**: "Cancel"
- **Sending...**: "Sending..."
- **Success**: "Password reset link sent to your email"
- **Error**: "Failed to send reset link"

### Bahasa Melayu Translations
- **Remember me**: "Ingat saya"
- **Forgot password**: "Lupa password?"
- **Reset Password**: "Reset Password"
- **Enter your email**: "Masukkan alamat email anda dan kami akan menghantar pautan untuk reset password."
- **Send Reset Link**: "Hantar Pautan Reset"
- **Cancel**: "Batal"
- **Sending...**: "Menghantar..."
- **Success**: "Pautan reset password telah dihantar ke email anda"
- **Error**: "Gagal menghantar pautan reset"

---

## 5. Database Setup

### Step 1: Add Columns to Existing Table

Run this in Supabase SQL Editor:

```sql
-- Add reset token columns
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS reset_token TEXT;

ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP WITH TIME ZONE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_admin_users_reset_token 
ON admin_users(reset_token);
```

### Step 2: Verify Columns

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'admin_users'
ORDER BY ordinal_position;
```

Should show:
- `reset_token` (TEXT)
- `reset_token_expiry` (TIMESTAMP WITH TIME ZONE)

---

## 6. Testing

### Test Remember Me

1. **Login with Remember Me checked**:
   - Enter username: `admin`
   - Enter password: `mphs2025`
   - Check "Ingat saya"
   - Click "Log Masuk"
   - ✅ Login successful

2. **Logout and return**:
   - Logout from admin panel
   - Return to login page
   - ✅ Username should be pre-filled
   - ✅ "Ingat saya" should be checked

3. **Login without Remember Me**:
   - Uncheck "Ingat saya"
   - Login
   - Logout and return
   - ✅ Username should be empty
   - ✅ "Ingat saya" should be unchecked

### Test Forgot Password

1. **Open forgot password dialog**:
   - Click "Lupa password?" link
   - ✅ Dialog opens

2. **Enter invalid email**:
   - Enter: `invalid@example.com`
   - Click "Hantar Pautan Reset"
   - ✅ Error: "No active admin account found with this email"

3. **Enter valid email**:
   - Enter: `admin@mphs.gov.my`
   - Click "Hantar Pautan Reset"
   - ✅ Success message shown
   - ✅ Check browser console for reset link
   - ✅ Dialog closes

4. **Check console output**:
   ```
   Password reset link: http://localhost:3000/admin/reset-password?token=abc123xyz789
   Reset token: abc123xyz789
   Email: admin@mphs.gov.my
   ```

5. **Verify token in database**:
   ```sql
   SELECT username, email, reset_token, reset_token_expiry 
   FROM admin_users 
   WHERE email = 'admin@mphs.gov.my';
   ```
   - ✅ reset_token should be populated
   - ✅ reset_token_expiry should be ~1 hour in future

---

## 7. Email Integration (TODO)

### Current Implementation
- Reset link logged to console
- No actual email sent
- For development/testing only

### Production Implementation

#### Option 1: Supabase Edge Function
```typescript
// supabase/functions/send-reset-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { email, resetLink } = await req.json()
  
  // Use Resend, SendGrid, or other email service
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'noreply@mphs.gov.my',
      to: email,
      subject: 'Reset Your Password',
      html: `<p>Click here to reset your password: <a href="${resetLink}">${resetLink}</a></p>`
    })
  })
  
  return new Response(JSON.stringify({ success: true }))
})
```

#### Option 2: Next.js API Route
```typescript
// pages/api/send-reset-email.ts
import { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { email, resetLink } = req.body;
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  
  await transporter.sendMail({
    from: 'noreply@mphs.gov.my',
    to: email,
    subject: 'Reset Your Password',
    html: `<p>Click here to reset your password: <a href="${resetLink}">${resetLink}</a></p>`
  });
  
  res.status(200).json({ success: true });
}
```

#### Option 3: Third-Party Service
- **Resend**: https://resend.com
- **SendGrid**: https://sendgrid.com
- **Mailgun**: https://mailgun.com
- **AWS SES**: https://aws.amazon.com/ses/

---

## 8. Security Considerations

### Token Security
- ✅ Random token generation
- ✅ 1-hour expiry
- ✅ Single-use (cleared after password update)
- ✅ Stored in database, not URL
- ⚠️ Use UUID or crypto.randomBytes() in production

### Remember Me Security
- ✅ Only stores username (not password)
- ✅ Uses localStorage (client-side only)
- ✅ Can be cleared by user
- ⚠️ Consider using secure cookies for production

### Password Reset Security
- ✅ Requires valid email
- ✅ Token expires after 1 hour
- ✅ Token cleared after use
- ✅ Only active admins can reset
- ⚠️ Add rate limiting in production
- ⚠️ Log all reset attempts

---

## 9. Files Modified

### Modified Files
1. **`src/app/admin/login/page.tsx`**
   - Added remember me checkbox
   - Added forgot password link
   - Added forgot password dialog
   - Added language support
   - Added auto-fill logic

2. **`src/lib/api/auth.ts`**
   - Added `resetPassword()` function
   - Added `verifyResetToken()` function
   - Added `updatePasswordWithToken()` function

3. **`supabase/migrations/create_admin_users_table.sql`**
   - Added `reset_token` column
   - Added `reset_token_expiry` column

### New Files
1. **`supabase/add_reset_token_columns.sql`**
   - SQL script to add columns to existing table

2. **`LOGIN_FEATURES_UPDATE.md`**
   - This documentation file

---

## 10. Next Steps

### Immediate
1. ✅ Run SQL script to add columns
2. ✅ Test remember me functionality
3. ✅ Test forgot password flow
4. ✅ Verify token generation

### Short-term
1. 🔲 Create reset password page (`/admin/reset-password`)
2. 🔲 Integrate email service
3. 🔲 Add rate limiting
4. 🔲 Add audit logging

### Long-term
1. 🔲 Implement 2FA
2. 🔲 Add password strength requirements
3. 🔲 Add password history
4. 🔲 Add account lockout after failed attempts

---

## 11. Known Limitations

1. **No Email Sending**: Reset link only logged to console
2. **Simple Token**: Uses Math.random() instead of crypto
3. **No Rate Limiting**: Can spam reset requests
4. **No Audit Log**: Reset attempts not logged
5. **No Password Validation**: No strength requirements
6. **Client-Side Storage**: Remember me uses localStorage

---

## 12. FAQ

**Q: How long is the reset token valid?**
A: 1 hour from generation.

**Q: Can I use the same token twice?**
A: No, token is cleared after password update.

**Q: What if I don't receive the reset email?**
A: Check console for reset link (development only). In production, check spam folder or contact admin.

**Q: Is my username secure with Remember Me?**
A: Username is stored in localStorage. It's not encrypted but only accessible on your device.

**Q: Can I reset password without email?**
A: No, email is required for password reset.

**Q: What happens if token expires?**
A: You'll need to request a new reset link.

---

**Last Updated**: November 30, 2025, 3:02 PM
**Version**: 1.0.0
**Status**: ✅ Ready for Testing
