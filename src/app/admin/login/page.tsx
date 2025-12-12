"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { Eye, EyeOff } from 'lucide-react';

export default function AdminLogin() {
  const router = useRouter();
  const { language } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { loginAdmin } = await import('@/lib/api/auth');
      const result = await loginAdmin(username, password);

      console.log('Login attempt:', { username, hasPassword: !!password });
      console.log('Login result:', result);
      
      if (result.success && result.user) {
        // Set session with role
        localStorage.setItem('adminLoggedIn', 'true');
        localStorage.setItem('adminRole', result.role || 'admin');
        localStorage.setItem('adminUser', JSON.stringify(result.user));
        document.cookie = 'adminLoggedIn=true; path=/';
        
        console.log('✅ Login successful - Stored in localStorage:', {
          username: result.user.username,
          role: result.role,
          fullName: result.user.full_name,
          storedRole: localStorage.getItem('adminRole'),
          storedLoggedIn: localStorage.getItem('adminLoggedIn')
        });
        
        toast.success(language === 'en' 
          ? `Login successful! Welcome ${result.user.full_name}`
          : `Login berjaya! Selamat datang ${result.user.full_name}`
        );
        
        // Force page reload to ensure state is fresh
        window.location.href = '/admin';
      } else {
        console.error('❌ Login failed:', result);
        toast.error(language === 'en' ? 'Invalid username or password' : 'Username atau password salah');
        setLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(language === 'en' ? 'Login error. Please try again.' : 'Ralat semasa login. Sila cuba lagi.');
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative h-20 w-20">
              <Image
                src="/mphs.jpg"
                alt="MPHS Logo"
                width={80}
                height={80}
                className="object-contain"
              />
            </div>
          </div>
          <CardTitle className="text-2xl">{language === 'en' ? 'Admin Login' : 'Log Masuk Admin'}</CardTitle>
          <CardDescription>
            {language === 'en' 
              ? 'Hulu Selangor Municipal Council'
              : 'Majlis Perbandaran Hulu Selangor'}
            <br />
            {language === 'en' ? 'e - OKU System' : 'Sistem e-OKU'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="username">{language === 'en' ? 'Username' : 'Nama Pengguna'}</Label>
              <Input
                id="username"
                type="text"
                placeholder={language === 'en' ? 'Enter username' : 'Masukkan username'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">{language === 'en' ? 'Password' : 'Kata Laluan'}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={language === 'en' ? 'Enter password' : 'Masukkan password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading 
                ? (language === 'en' ? 'Logging in...' : 'Memasuki...')
                : (language === 'en' ? 'Login' : 'Log Masuk')}
            </Button>
          </form>
          
          
        </CardContent>
      </Card>
    </div>
  );
}
