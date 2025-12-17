"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
// import StatusChecker from '@/components/StatusChecker'; // REMOVED
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { FileText, Upload, CheckCircle, Package, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getApplicationByIC } from '@/lib/api/applications';

export default function Home() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [icNumber, setIcNumber] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const [showButtons, setShowButtons] = useState(false);

  // Validate Malaysian IC format (YYMMDD-PB-###G)
  const isValidICFormat = (ic: string): boolean => {
    const cleanIC = ic.replace(/[-\s]/g, '');
    
    // Must be exactly 12 digits
    if (cleanIC.length !== 12 || !/^\d+$/.test(cleanIC)) {
      return false;
    }
    
    // Validate date part (YYMMDD)
    const year = parseInt(cleanIC.substring(0, 2));
    const month = parseInt(cleanIC.substring(2, 4));
    const day = parseInt(cleanIC.substring(4, 6));
    
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    
    return true;
  };

  // Check if user exists in Supabase database
  const checkUserExists = async (ic: string) => {
    console.log('🔍 Homepage - Checking IC:', ic);
    setIsChecking(true);
    setShowButtons(false);
    setUserExists(null);
    
    try {
      // First validate IC format
      if (!isValidICFormat(ic)) {
        console.log('❌ Invalid IC format');
        setUserExists(null); // null means invalid format
        setShowButtons(true);
        setIsChecking(false);
        return;
      }
      
      const cleanIC = ic.replace(/[-\s]/g, '');
      console.log('📡 Calling getApplicationByIC with:', cleanIC);
      
      // Try to get application from database
      const app = await getApplicationByIC(cleanIC);
      
      console.log('✅ User found in database!', app.ref_no);
      setUserExists(true);
      setShowButtons(true);
    } catch (error) {
      console.log('❌ User not found in database');
      setUserExists(false);
      setShowButtons(true);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (icNumber.trim()) {
      checkUserExists(icNumber);
    }
  };

  const handleNewRegistration = () => {
    // Store IC in sessionStorage for the form
    sessionStorage.setItem('applicantIC', icNumber);
    router.push('/permohonan/baharu');
  };

  const handleRenewal = () => {
    // Store IC in sessionStorage for the form
    sessionStorage.setItem('applicantIC', icNumber);
    router.push('/permohonan/pembaharuan');
  };

  const processSteps = [
    {
      icon: <FileText className="h-8 w-8" />,
      titleKey: 'process.step1.title',
      descKey: 'process.step1.desc',
    },
    {
      icon: <Upload className="h-8 w-8" />,
      titleKey: 'process.step2.title',
      descKey: 'process.step2.desc',
    },
    {
      icon: <CheckCircle className="h-8 w-8" />,
      titleKey: 'process.step3.title',
      descKey: 'process.step3.desc',
    },
    {
      icon: <Package className="h-8 w-8" />,
      titleKey: 'process.step4.title',
      descKey: 'process.step4.desc',
    },
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen">
        {/* Hero Section with IC Validation */}
        <section className="relative bg-gradient-to-br from-primary/10 via-background to-background py-0 -mt-4">
          <div className="container mx-auto px-3 sm:px-4 lg:px-4">
            <div className="max-w-2xl mx-auto">
              <div className="text-center">
                {/* Logo e-OKU */}
                <div className="flex justify-center mb-0">
                  <div className="relative w-80 h-80 sm:w-96 sm:h-96">
                    <Image
                      src="/e-oku.png"
                      alt="Logo e-OKU"
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                </div>
                
                {/* Nama Penuh Majlis */}
                <div className="-mt-8">
                  <h2 className="text-lg sm:text-xl font-bold text-primary mb-0">
                    {t('hero.mphs')}
                  </h2>
                </div>
                
                {/* Sistem Title */}
                <div className="border-t border-b border-primary/20 py-0.5 mt-0.5">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-0.5">
                    {t('hero.systemTitle')}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {t('hero.subtitle')}
                  </p>
                </div>
              </div>

              <Card className="shadow-lg mt-2">
                <CardHeader className="text-center pb-1 pt-2">
                  <CardTitle className="text-lg">{t('hero.enterIC')}</CardTitle>
                  <CardDescription className="text-xs">{t('hero.checkRegistration')}</CardDescription>
                </CardHeader>
                <CardContent className="pb-3">
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                      <Input
                        type="text"
                        placeholder={t('hero.icPlaceholder')}
                        value={icNumber}
                        onChange={(e) => setIcNumber(e.target.value)}
                        className="text-base h-10"
                        disabled={isChecking}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-10 text-base"
                      disabled={isChecking || !icNumber.trim()}
                    >
                      {isChecking ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('hero.checking')}
                        </>
                      ) : (
                        t('hero.check')
                      )}
                    </Button>
                  </form>

                  {/* Show buttons after checking */}
                  {showButtons && (
                    <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-4 duration-500">
                      {userExists === null ? (
                        <>
                          <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-center">
                            <AlertCircle className="h-4 w-4 text-red-600 mx-auto mb-1" />
                            <p className="text-xs text-red-800 font-medium">
                              Format No. Kad Pengenalan tidak sah
                            </p>
                            <p className="text-red-600 text-xs mt-1">
                              Sila masukkan No. Kad Pengenalan yang betul (contoh: 990101-01-1234)
                            </p>
                          </div>
                        </>
                      ) : userExists ? (
                        <>
                          <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-center">
                            <p className="text-sm text-green-800 font-medium mb-2">
                              {t('hero.recordFound')}
                            </p>
                          </div>
                          <Button 
                            onClick={() => {
                              sessionStorage.setItem('applicantIC', icNumber);
                              router.push('/semak-ic');
                            }}
                            className="w-full h-10 text-base bg-blue-600 hover:bg-blue-700"
                          >
                            {t('hero.viewDetails')}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-center">
                            <p className="text-sm text-amber-800 font-medium mb-2">
                              {t('hero.noRecord')}
                            </p>
                          </div>
                          <Button 
                            onClick={handleNewRegistration}
                            className="w-full h-10 text-base bg-green-600 hover:bg-green-700"
                          >
                            {t('hero.newApplication')}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </div>
        </section>

        {/* Info Section - Keperluan Dokumen */}
        <section className="py-4 sm:py-6 bg-muted/50">
          <div className="container mx-auto px-3 sm:px-4 lg:px-4">
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-2xl">
                    {language === 'en' ? 'Document Requirements' : 'Keperluan Dokumen'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                      <span>
                        {language === 'en' 
                          ? 'One (1) Copy of Identity Card or Birth Certificate of Applicant / Dependent'
                          : 'Satu (1) Salinan Kad Pengenalan atau Sijil Kelahiran Pemohon / Tanggungan'}
                      </span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                      <span>
                        {language === 'en'
                          ? 'One (1) Copy of OKU Card of Applicant / Dependent'
                          : 'Satu (1) Salinan Kad OKU Pemohon / Tanggungan'}
                      </span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                      <span>
                        {language === 'en'
                          ? "One (1) Copy of Applicant's Driving License"
                          : 'Satu (1) Salinan Lesen Memandu Pemohon'}
                      </span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                      <span>
                        {language === 'en'
                          ? 'One Passport-Sized Photo of OKU'
                          : 'Sekeping Gambar Ukuran Pasport OKU'}
                      </span>
                    </li>
                    <li className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-red-700 font-medium">
                        {language === 'en'
                          ? 'Old OKU Sticker Must Be Returned (If Renewal Application) - Bring when collecting new sticker'
                          : 'Pelekat OKU Yang Lama Dikembalikan (Jika Permohonan Pembaharuan) - Bawa semasa mengambil pelekat baharu'}
                      </span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Process Steps Section */}
        <section className="py-6 sm:py-8">
          <div className="container mx-auto px-3 sm:px-4 lg:px-4">
            <div className="text-center mb-4">
              <h2 className="text-3xl sm:text-4xl font-bold mb-2">{t('process.title')}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {processSteps.map((step, index) => (
                <Card key={index} className="relative">
                  <CardHeader>
                    <div className="mb-4 inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary">
                      {step.icon}
                    </div>
                    <CardTitle className="text-xl">{t(step.titleKey)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">{t(step.descKey)}</CardDescription>
                  </CardContent>
                  {index < processSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                      <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Status Checker Section */}
        {/* StatusChecker section REMOVED - use Semak IC page instead */}
      </main>
      <Footer />
    </>
  );
}