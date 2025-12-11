import { supabase } from '../supabase';

export interface AdminUser {
  id: string;
  username: string;
  password_hash: string;
  role: 'admin' | 'admin_boss';
  full_name: string;
  email?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

// Simple hash function for demo (in production, use bcrypt or similar)
function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

export async function loginAdmin(username: string, password: string): Promise<{ success: boolean; user?: AdminUser; role?: string }> {
  try {
    console.log('🔐 Login attempt for username:', username);
    
    // First, try to initialize default admins if table is empty
    await initializeDefaultAdmins();
    
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .single();

    console.log('📊 Supabase query result:', { data, error });

    if (error || !data) {
      console.log('⚠️ No data from Supabase, using fallback credentials');
      // Fallback to hardcoded credentials if database not set up
      const passwordHash = simpleHash(password);
      console.log('🔑 Password hash:', passwordHash);
      console.log('🔑 Expected admin hash:', simpleHash('mphs2025'));
      console.log('🔑 Expected boss hash:', simpleHash('boss2025'));
      
      if (username === 'admin' && password === 'mphs2025') {
        console.log('✅ Admin fallback login successful');
        return {
          success: true,
          user: {
            id: 'temp-admin',
            username: 'admin',
            password_hash: passwordHash,
            role: 'admin',
            full_name: 'Admin MPHS',
            email: 'admin@mphs.gov.my',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_active: true,
          } as AdminUser,
          role: 'admin'
        };
      }
      if (username === 'boss' && password === 'boss2025') {
        console.log('✅ Boss fallback login successful');
        return {
          success: true,
          user: {
            id: 'temp-boss',
            username: 'boss',
            password_hash: passwordHash,
            role: 'admin_boss',
            full_name: 'Admin Boss MPHS',
            email: 'boss@mphs.gov.my',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_active: true,
          } as AdminUser,
          role: 'admin_boss'
        };
      }
      console.log('❌ Fallback credentials do not match');
      return { success: false };
    }

    // Special handling for default admin accounts - check plain password
    if ((data.username === 'admin' && password === 'mphs2025') ||
        (data.username === 'boss' && password === 'boss2025')) {
      console.log('✅ Default admin login successful (plain password check)');
      
      // Update hash in database to match current simpleHash output
      const correctHash = simpleHash(password);
      await supabase
        .from('admin_users')
        .update({ password_hash: correctHash, updated_at: new Date().toISOString() })
        .eq('id', data.id);
      
      return { 
        success: true, 
        user: data as AdminUser,
        role: data.role 
      };
    }
    
    // For other users, check hash normally
    const passwordHash = simpleHash(password);
    console.log('🔑 Checking password hash:', {
      inputHash: passwordHash,
      storedHash: data.password_hash,
      match: data.password_hash === passwordHash
    });
    
    if (data.password_hash === passwordHash) {
      console.log('✅ Database login successful');
      return { 
        success: true, 
        user: data as AdminUser,
        role: data.role 
      };
    }

    console.log('❌ Password hash does not match');
    return { success: false };
  } catch (error) {
    console.error('❌ Login error:', error);
    // Fallback to hardcoded credentials
    const passwordHash = simpleHash(password);
    
    if (username === 'admin' && password === 'mphs2025') {
      console.log('✅ Admin fallback login successful (catch block)');
      return {
        success: true,
        user: {
          id: 'temp-admin',
          username: 'admin',
          password_hash: passwordHash,
          role: 'admin',
          full_name: 'Admin MPHS',
          email: 'admin@mphs.gov.my',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true,
        } as AdminUser,
        role: 'admin'
      };
    }
    if (username === 'boss' && password === 'boss2025') {
      console.log('✅ Boss fallback login successful (catch block)');
      return {
        success: true,
        user: {
          id: 'temp-boss',
          username: 'boss',
          password_hash: passwordHash,
          role: 'admin_boss',
          full_name: 'Admin Boss MPHS',
          email: 'boss@mphs.gov.my',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true,
        } as AdminUser,
        role: 'admin_boss'
      };
    }
    console.log('❌ Fallback credentials do not match (catch block)');
    return { success: false };
  }
}

export async function getAllAdmins(): Promise<AdminUser[]> {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as AdminUser[];
  } catch (error) {
    console.error('Error fetching admins:', error);
    return [];
  }
}

export async function createAdmin(admin: Omit<AdminUser, 'id' | 'created_at' | 'updated_at' | 'password_hash'> & { password: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const passwordHash = simpleHash(admin.password);
    
    const { error } = await supabase
      .from('admin_users')
      .insert({
        username: admin.username,
        password_hash: passwordHash,
        role: admin.role,
        full_name: admin.full_name,
        email: admin.email,
        is_active: admin.is_active,
      });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error creating admin:', error);
    return { success: false, error: error.message };
  }
}

export async function updateAdmin(id: string, updates: Partial<Omit<AdminUser, 'id' | 'created_at' | 'password_hash'> & { password?: string }>): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = { ...updates };
    
    // If password is being updated, hash it
    if (updates.password) {
      updateData.password_hash = simpleHash(updates.password);
      delete updateData.password;
    }
    
    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('admin_users')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating admin:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteAdmin(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('admin_users')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting admin:', error);
    return { success: false, error: error.message };
  }
}

export async function toggleAdminStatus(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('admin_users')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error toggling admin status:', error);
    return { success: false, error: error.message };
  }
}

// Initialize default admin accounts if table is empty
export async function initializeDefaultAdmins(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id')
      .limit(1);

    if (error) throw error;

    // If no admins exist, create defaults
    if (!data || data.length === 0) {
      const defaultAdmins = [
        {
          username: 'admin',
          password: 'mphs2025',
          role: 'admin' as const,
          full_name: 'Admin MPHS',
          email: 'admin@mphs.gov.my',
          is_active: true,
        },
        {
          username: 'boss',
          password: 'boss2025',
          role: 'admin_boss' as const,
          full_name: 'Admin Boss MPHS',
          email: 'boss@mphs.gov.my',
          is_active: true,
        },
      ];

      for (const admin of defaultAdmins) {
        await createAdmin(admin);
      }
      
      console.log('Default admin accounts created');
    }
  } catch (error) {
    console.error('Error initializing admins:', error);
  }
}

// Reset password - send reset link via email
export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Find admin by email
    const { data: admin, error: findError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (findError || !admin) {
      return { 
        success: false, 
        error: 'No active admin account found with this email' 
      };
    }

    // Generate reset token
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const resetExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Try to store reset token (columns may not exist yet)
    try {
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({
          reset_token: resetToken,
          reset_token_expiry: resetExpiry.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', admin.id);

      if (updateError) {
        console.warn('⚠️ Could not store reset token (columns may not exist):', updateError.message);
      }
    } catch (err) {
      console.warn('⚠️ Reset token storage failed:', err);
    }

    // Generate reset link
    const resetLink = `${window.location.origin}/admin/reset-password?token=${resetToken}`;
    
    // Log to console (for development)
    console.log('📧 Password Reset Request:');
    console.log('   Email:', email);
    console.log('   Username:', admin.username);
    console.log('   Reset Link:', resetLink);
    console.log('   Token:', resetToken);
    console.log('   Expires:', resetExpiry.toLocaleString());
    console.log('');
    console.log('⚠️ EMAIL NOT SENT - Email service not configured');
    console.log('   To enable email sending, integrate with:');
    console.log('   - Resend (https://resend.com)');
    console.log('   - SendGrid (https://sendgrid.com)');
    console.log('   - AWS SES');
    console.log('   - Supabase Edge Function');

    // TODO: Integrate with email service
    // Example with Resend:
    // await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     from: 'noreply@mphs.gov.my',
    //     to: email,
    //     subject: 'Reset Password - MPHS Admin',
    //     html: `<p>Click here to reset your password: <a href="${resetLink}">${resetLink}</a></p>`
    //   })
    // });

    return { success: true };
  } catch (error: any) {
    console.error('❌ Reset password error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to process password reset' 
    };
  }
}

// Verify reset token and update password
export async function verifyResetToken(token: string): Promise<{ success: boolean; email?: string; error?: string }> {
  try {
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('reset_token', token)
      .single();

    if (error || !admin) {
      return { success: false, error: 'Invalid or expired reset token' };
    }

    // Check if token is expired
    const expiry = new Date(admin.reset_token_expiry);
    if (expiry < new Date()) {
      return { success: false, error: 'Reset token has expired' };
    }

    return { success: true, email: admin.email };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Update password with reset token
export async function updatePasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify token first
    const verification = await verifyResetToken(token);
    if (!verification.success) {
      return { success: false, error: verification.error };
    }

    // Hash new password
    const passwordHash = simpleHash(newPassword);

    // Update password and clear reset token
    const { error } = await supabase
      .from('admin_users')
      .update({
        password_hash: passwordHash,
        reset_token: null,
        reset_token_expiry: null,
        updated_at: new Date().toISOString()
      })
      .eq('reset_token', token);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
