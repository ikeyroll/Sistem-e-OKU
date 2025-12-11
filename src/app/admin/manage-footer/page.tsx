'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ManageFooterPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Footer settings state
  const [facebookLink, setFacebookLink] = useState('');
  const [instagramLink, setInstagramLink] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [tiktokLink, setTiktokLink] = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');
  const [assetNumber, setAssetNumber] = useState('');

  // Check if user is admin_boss
  useEffect(() => {
    const role = localStorage.getItem('adminRole');
    if (role !== 'admin_boss') {
      toast.error(language === 'en' ? 'Access denied' : 'Akses ditolak');
      router.push('/admin');
      return;
    }

    // Load current footer settings
    loadFooterSettings();
  }, [router, language]);

  const loadFooterSettings = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading footer settings from API...');
      const response = await fetch('/api/footer-settings');
      console.log('📡 API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Loaded footer settings:', data);
        setFacebookLink(data.facebook_link || '');
        setInstagramLink(data.instagram_link || '');
        setYoutubeLink(data.youtube_link || '');
        setTiktokLink(data.tiktok_link || '');
        setWhatsappLink(data.whatsapp_link || '');
        setAssetNumber(data.asset_number || '');
        console.log('✅ Footer settings loaded into form');
      } else {
        console.error('❌ Failed to load settings, status:', response.status);
      }
    } catch (error) {
      console.error('❌ Error loading footer settings:', error);
      toast.error(language === 'en' ? 'Failed to load settings' : 'Gagal memuatkan tetapan');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log('💾 Saving footer settings...');
      const payload = {
        facebook_link: facebookLink,
        instagram_link: instagramLink,
        youtube_link: youtubeLink,
        tiktok_link: tiktokLink,
        whatsapp_link: whatsappLink,
        asset_number: assetNumber,
      };
      console.log('📤 Payload:', payload);
      
      const response = await fetch('/api/footer-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('📡 Save response status:', response.status);
      const responseData = await response.json();
      console.log('📦 Save response data:', responseData);

      if (response.ok) {
        toast.success(language === 'en' ? 'Settings saved successfully' : 'Tetapan berjaya disimpan');
        // Reload to confirm save
        await loadFooterSettings();
      } else {
        console.error('❌ Save failed:', responseData);
        throw new Error(responseData.error || 'Failed to save');
      }
    } catch (error) {
      console.error('❌ Error saving footer settings:', error);
      toast.error(language === 'en' ? 'Failed to save settings' : 'Gagal menyimpan tetapan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen py-12 bg-gradient-to-br from-primary/5 to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => router.push('/admin')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {language === 'en' ? 'Back to Admin' : 'Kembali ke Admin'}
            </Button>
            <h1 className="text-3xl font-bold mb-2">
              {language === 'en' ? 'Manage Footer Settings' : 'Urus Tetapan Footer'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'en' 
                ? 'Update social media links and asset number displayed in the footer' 
                : 'Kemaskini pautan media sosial dan nombor aset yang dipaparkan di footer'}
            </p>
          </div>

          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  {language === 'en' ? 'Loading...' : 'Memuatkan...'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Social Media Links */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>{language === 'en' ? 'Social Media Links' : 'Pautan Media Sosial'}</CardTitle>
                  <CardDescription>
                    {language === 'en' 
                      ? 'Enter the full URL for each social media platform' 
                      : 'Masukkan URL penuh untuk setiap platform media sosial'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Facebook</Label>
                    <Input
                      value={facebookLink}
                      onChange={(e) => setFacebookLink(e.target.value)}
                      placeholder="https://www.facebook.com/..."
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">Instagram</Label>
                    <Input
                      value={instagramLink}
                      onChange={(e) => setInstagramLink(e.target.value)}
                      placeholder="https://www.instagram.com/..."
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">YouTube</Label>
                    <Input
                      value={youtubeLink}
                      onChange={(e) => setYoutubeLink(e.target.value)}
                      placeholder="https://www.youtube.com/..."
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">TikTok</Label>
                    <Input
                      value={tiktokLink}
                      onChange={(e) => setTiktokLink(e.target.value)}
                      placeholder="https://www.tiktok.com/..."
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">WhatsApp</Label>
                    <Input
                      value={whatsappLink}
                      onChange={(e) => setWhatsappLink(e.target.value)}
                      placeholder="https://wa.me/..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Asset Number */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>{language === 'en' ? 'Asset Number' : 'No Aset'}</CardTitle>
                  <CardDescription>
                    {language === 'en' 
                      ? 'Asset number displayed in the footer' 
                      : 'Nombor aset yang dipaparkan di footer'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label className="mb-2 block">{language === 'en' ? 'Asset Number' : 'No Aset'}</Label>
                    <Input
                      value={assetNumber}
                      onChange={(e) => setAssetNumber(e.target.value)}
                      placeholder="1029392"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} size="lg">
                  <Save className="w-4 h-4 mr-2" />
                  {saving 
                    ? (language === 'en' ? 'Saving...' : 'Menyimpan...') 
                    : (language === 'en' ? 'Save Changes' : 'Simpan Perubahan')}
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
