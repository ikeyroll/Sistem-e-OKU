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
  const { t } = useLanguage();
  const router = useRouter();
  const [icNumber, setIcNumber] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const [showButtons, setShowButtons] = useState(false);

  // Check if user exists in Supabase database
  const checkUserExists = async (ic: string) => {
    console.log('🔍 Homepage - Checking IC:', ic);
    setIsChecking(true);
    setShowButtons(false);
    
    try {
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
        <section className="relative bg-gradient-to-br from-primary/10 via-background to-background py-20 sm:py-32">
          <div className="container mx-auto px-6 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                {/* Logo e-OKU */}
                <div className="flex justify-center mb-6">
                  <div className="relative w-90 h-90 sm:w-100 sm:h-100">
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
                <div className="mb-6">
                  <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-2">
                    {t('hero.mphs')}
                  </h2>
                </div>
                
                {/* Sistem Title */}
                <div className="border-t border-b border-primary/20 py-4">
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
                    {t('hero.systemTitle')}
                  </h1>
                  <p className="text-base sm:text-lg text-muted-foreground">
                    {t('hero.subtitle')}
                  </p>
                </div>
              </div>

              <Card className="shadow-lg">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl">{t('hero.enterIC')}</CardTitle>
                  <CardDescription>{t('hero.checkRegistration')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Input
                        type="text"
                        placeholder={t('hero.icPlaceholder')}
                        value={icNumber}
                        onChange={(e) => setIcNumber(e.target.value)}
                        className="text-lg h-12"
                        disabled={isChecking}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-12 text-lg"
                      disabled={isChecking || !icNumber.trim()}
                    >
                      {isChecking ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          {t('hero.checking')}
                        </>
                      ) : (
                        t('hero.check')
                      )}
                    </Button>
                  </form>

                  {/* Show buttons after checking */}
                  {showButtons && (
                    <div className="mt-6 space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                      {userExists ? (
                        <>
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                            <p className="text-green-800 font-medium mb-3">
                              {t('hero.recordFound')}
                            </p>
                          </div>
                          <Button 
                            onClick={() => {
                              sessionStorage.setItem('applicantIC', icNumber);
                              router.push('/semak-ic');
                            }}
                            className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
                          >
                            {t('hero.viewDetails')}
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
                            <p className="text-amber-800 font-medium mb-3">
                              {t('hero.noRecord')}
                            </p>
                          </div>
                          <Button 
                            onClick={handleNewRegistration}
                            className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
                          >
                            {t('hero.newApplication')}
                            <ArrowRight className="ml-2 h-5 w-5" />
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
        <section className="py-16 sm:py-24 bg-muted/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Keperluan Dokumen</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                      <span>Satu (1) Salinan Kad Pengenalan atau Sijil Kelahiran Pemohon / Tanggungan</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                      <span>Satu (1) Salinan Kad OKU Pemohon / Tanggungan</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                      <span>Satu (1) Salinan Lesen Memandu Pemohon</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                      <span>Sekeping Gambar Ukuran Pasport OKU</span>
                    </li>
                    <li className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-red-700 font-medium">Pelekat OKU Yang Lama Dikembalikan (Jika Permohonan Pembaharuan) - Bawa semasa mengambil pelekat baharu</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Process Steps Section */}
        <section className="py-16 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('process.title')}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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