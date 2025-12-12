"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Home, FileText, Download } from 'lucide-react';
import Link from 'next/link';

function PermohonanBerjayaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [refNo, setRefNo] = useState('');
  const [isRenewal, setIsRenewal] = useState(false);

  useEffect(() => {
    const ref = searchParams.get('ref');
    const type = searchParams.get('type');
    
    if (ref) {
      setRefNo(ref);
    }
    
    if (type === 'renewal') {
      setIsRenewal(true);
    }
  }, [searchParams]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Header />
      <main className="min-h-screen py-6 sm:py-12 bg-gradient-to-br from-green-50 to-background">
        <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
          <Card className="shadow-xl">
            <CardContent className="p-4 sm:p-8 text-center">
              {/* Success Icon */}
              <div className="mb-4 sm:mb-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" />
                </div>
              </div>

              {/* Success Message */}
              <h1 className="text-2xl sm:text-3xl font-bold text-green-600 mb-2">
                {isRenewal ? 'Pembaharuan Berjaya!' : 'Permohonan Berjaya Dihantar!'}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 px-2">
                {isRenewal 
                  ? 'Pembaharuan anda telah diterima dan sedang diproses'
                  : 'Permohonan anda telah diterima dan sedang diproses'
                }
              </p>

              {/* Reference Number */}
              <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
                <p className="text-xs sm:text-sm text-muted-foreground mb-2">Nombor IC</p>
                <p className="text-2xl sm:text-3xl font-bold text-primary break-all">{refNo}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 sm:mt-3 px-2">
                  Sila guna nombor IC ini untuk semakan status
                </p>
              </div>

              {/* Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-6 sm:mb-8 text-left">
                <h3 className="font-semibold text-sm sm:text-base text-blue-900 mb-2">Maklumat Penting:</h3>
                <ul className="space-y-2 text-xs sm:text-sm text-blue-800">
                  <li className="flex items-start">
                    <span className="mr-2 flex-shrink-0">•</span>
                    <span>Permohonan akan diproses dalam tempoh 5 hari bekerja</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 flex-shrink-0">•</span>
                    <span>Anda akan menerima status terkini melalui semakan</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 flex-shrink-0">•</span>
                    <span>Pelekat boleh diambil di Pejabat MPHS selepas diluluskan</span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button 
                  onClick={handlePrint}
                  variant="default" 
                  className="w-full text-sm sm:text-base h-10 sm:h-11"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Muat Turun Resit
                </Button>

                <Link href="/" className="block">
                  <Button variant="outline" className="w-full text-sm sm:text-base h-10 sm:h-11">
                    <Home className="w-4 h-4 mr-2" />
                    Kembali ke Laman Utama
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Print Section (hidden on screen) */}
          <div className="hidden print:block mt-8">
            <div className="border-2 border-gray-300 p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">Resit Permohonan Pelekat OKU</h2>
                <p className="text-sm text-gray-600">Majlis Perbandaran Hulu Selangor</p>
              </div>
              
              <div className="mb-6">
                <p className="font-semibold">Nombor Rujukan:</p>
                <p className="text-2xl font-bold">{refNo}</p>
              </div>

              <div className="mb-6">
                <p className="font-semibold">Jenis Permohonan:</p>
                <p>{isRenewal ? 'Pembaharuan' : 'Pendaftaran Baharu'}</p>
              </div>

              <div className="mb-6">
                <p className="font-semibold">Tarikh:</p>
                <p>{new Date().toLocaleDateString('ms-MY', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
              </div>

              <div className="border-t pt-4 mt-8">
                <p className="text-sm text-gray-600">
                  Sila simpan resit ini untuk rujukan anda.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function PermohonanBerjaya() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <PermohonanBerjayaContent />
    </Suspense>
  );
}
