"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle, AlertCircle, User, Calendar, Clock } from 'lucide-react';
import { getApplicationByIC } from '@/lib/api/applications';

export default function SemakIC() {
  const router = useRouter();
  const [icNumber, setIcNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  // Auto-search if IC is in sessionStorage (from homepage)
  useEffect(() => {
    const storedIC = sessionStorage.getItem('applicantIC');
    if (storedIC) {
      setIcNumber(storedIC);
      // Auto-trigger search
      setTimeout(() => {
        performSearch(storedIC);
      }, 500);
      // Clear from sessionStorage after use
      sessionStorage.removeItem('applicantIC');
    }
  }, []);

  // Helper function to perform search (can be called from useEffect or button)
  const performSearch = async (ic: string) => {
    console.log('\n🔍 ===== SEARCHING FOR IC ===== ');
    console.log('📝 IC:', ic);
    
    if (!ic) {
      setError('Sila masukkan No. Kad Pengenalan');
      return;
    }

    const cleanIC = ic.replace(/[-\s]/g, '');
    
    if (cleanIC.length !== 12) {
      setError('No. Kad Pengenalan tidak sah');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const app = await getApplicationByIC(cleanIC);
      
      console.log('✅ REKOD DIJUMPAI!');
      
      const pemohon = typeof app.pemohon === 'string' ? JSON.parse(app.pemohon) : app.pemohon;
      
      const resultData = {
        found: true,
        refNo: app.ref_no,
        noSiri: app.no_siri,
        name: pemohon.name,
        ic: pemohon.ic,
        okuCard: pemohon.okuCard,
        taxAccount: pemohon.taxAccount,
        carReg: pemohon.carReg,
        status: app.status,
        applicationType: app.application_type,
        submittedDate: new Date(app.submitted_date).toLocaleDateString('ms-MY'),
        approvedDate: app.approved_date ? new Date(app.approved_date).toLocaleDateString('ms-MY') : undefined,
        // For expiry date, we'll show 31/12/YYYY where YYYY is 2 years from approval year
        expiryDate: app.expiry_date,
        // Format as 31/12/YYYY (2 years from approval year)
        expiryDateDisplay: (() => {
          if (!app.approved_date) return undefined;
          const approvalYear = new Date(app.approved_date).getFullYear();
          return `31/12/${approvalYear + 2}`;
        })(),
        // Check if current date is after December 31st of the second year from approval
        isExpired: (() => {
          if (!app.approved_date) return false;
          const approvalYear = new Date(app.approved_date).getFullYear();
          const expiryDate = new Date(approvalYear + 2, 11, 31); // December 31st of second year
          return new Date() > expiryDate;
        })(),
        adminNotes: app.admin_notes,
      };
      
      setResult(resultData);
    } catch (error: any) {
      console.error('❌ Error:', error);
      setError('Tiada rekod dijumpai dalam sistem');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate time remaining until expiry
  const calculateTimeRemaining = (expiryDate: string, approvedDate?: string) => {
    try {
      const now = new Date();
      
      // First, try to use the provided expiry date if it's valid
      let expiry = new Date(expiryDate);
      
      // If expiry date is invalid, try to calculate it from approved date
      if (isNaN(expiry.getTime()) && approvedDate) {
        const approvalDate = new Date(approvedDate);
        if (!isNaN(approvalDate.getTime())) {
          const approvalYear = approvalDate.getFullYear();
          expiry = new Date(approvalYear + 2, 11, 31); // Dec 31 of second year
        }
      }
      
      // If we still don't have a valid expiry date, use current date + 2 years as default
      if (isNaN(expiry.getTime())) {
        const currentYear = now.getFullYear();
        expiry = new Date(currentYear + 2, 11, 31); // Default to 2 years from now
      }
      
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // EXPIRED: Show years, months, days since expiry
      if (diffDays < 0) {
        const absDays = Math.abs(diffDays);
        const years = Math.floor(absDays / 365);
        const remainingDaysAfterYears = absDays % 365;
        const months = Math.floor(remainingDaysAfterYears / 30);
        const days = remainingDaysAfterYears % 30;
        
        let text = '';
        if (years > 0) text += `${years} tahun `;
        if (months > 0) text += `${months} bulan `;
        if (days > 0 || (!years && !months)) text += `${days} hari`;
        
        return {
          expired: true,
          text: `${text.trim()} lepas`,
          days: diffDays
        };
      }
      
      // NEAR EXPIRY (< 30 days): Show exact days only
      if (diffDays <= 30) {
        return {
          expired: false,
          text: `${diffDays} hari`,
          days: diffDays
        };
      }
      
      // STILL VALID (> 30 days): Show years, months, days
      const years = Math.floor(diffDays / 365);
      const remainingDaysAfterYears = diffDays % 365;
      const months = Math.floor(remainingDaysAfterYears / 30);
      const days = remainingDaysAfterYears % 30;
      
      let text = '';
      if (years > 0) text += `${years} tahun `;
      if (months > 0) text += `${months} bulan `;
      if (days > 0 || (!years && !months)) text += `${days} hari`;
      
      return {
        expired: false,
        text: text.trim() || '0 hari',
        days: diffDays,
        expiryDate: expiry // Return the calculated expiry date for debugging
      };
    } catch (error) {
      console.error('Error calculating time remaining:', error);
      return {
        expired: false,
        text: 'Error',
        days: 0
      };
    }
  };

  // Helper function to check if renewal is available (within 1 month of expiry or expired)
  const canRenew = (expiryDate: string, approvedDate?: string) => {
    const timeRemaining = calculateTimeRemaining(expiryDate, approvedDate);
    return timeRemaining.days <= 30 || timeRemaining.expired; // 1 month = ~30 days or already expired
  };

  const handleSearch = async () => {
    console.log('\n🔍 ===== BUTANG SEMAK DITEKAN ===== ');
    await performSearch(icNumber);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Dalam Proses':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Dalam Proses</Badge>;
      case 'Diluluskan':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Diluluskan</Badge>;
      case 'Sedia Diambil':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Sedia Diambil</Badge>;
      case 'Telah Diambil':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Telah Diambil</Badge>;
      case 'Tidak Berjaya':
      case 'Tidak Lengkap':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Tidak Lengkap</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen py-6 bg-gradient-to-br from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Header with Logo */}
          <div className="text-center mb-6">
            {/* Logo MPHS */}
            <div className="flex justify-center mb-4">
              <div className="relative w-24 h-24 sm:w-32 sm:h-32">
                <Image
                  src="/mphs.jpg"
                  alt="Logo MPHS"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            
            {/* Nama Penuh Majlis */}
            <div className="mb-2">
              <h2 className="text-xl sm:text-2xl font-bold text-primary mb-1">
                Majlis Perbandaran Hulu Selangor
              </h2>
            </div>
            
            {/* Sistem Title */}
            <div className="border-t border-b border-primary/20 py-2 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">Sistem e-Stiker Khas</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Daftar pelekat kenderaan OKU secara dalam talian dengan mudah dan cepat
              </p>
            </div>
          </div>

          {/* Search Card */}
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Sila Masukkan No Kad Pengenalan</CardTitle>
              <CardDescription>Untuk menyemak status pendaftaran anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* IC Input */}
              <div className="space-y-2">
                <Input
                  placeholder="Contoh: 020516-14-1516"
                  value={icNumber}
                  onChange={(e) => setIcNumber(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="text-center text-lg"
                  disabled={loading}
                />
              </div>

              {/* Search Button */}
              <Button 
                onClick={handleSearch} 
                disabled={loading || !icNumber}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Mencari...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Semak
                  </>
                )}
              </Button>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <p className="text-yellow-800 font-medium">{error}</p>
                  </div>
                </div>
              )}

              {/* Result */}
              {result && result.found && (
                <div className="space-y-4 pt-4">
                  {/* Status Badge */}
                  <div className="flex justify-center">
                    {getStatusBadge(result.status)}
                  </div>

                  {/* No Siri (if available) */}
                  {result.noSiri && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                      <p className="text-sm text-green-800 mb-1">No. Siri Pelekat</p>
                      <p className="text-2xl font-bold text-green-900 font-mono">{result.noSiri}</p>
                    </div>
                  )}

                  {/* User Info */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <User className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Maklumat Pemohon</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">No. Id</p>
                        <p className="font-mono font-semibold">{result.refNo}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Jenis</p>
                        <p className="font-semibold">{result.applicationType === 'baru' ? 'Baharu' : 'Pembaharuan'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Nama</p>
                        <p className="font-semibold">{result.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">No. IC</p>
                        <p className="font-mono font-semibold">{result.ic}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Kad OKU</p>
                        <p className="font-semibold">{result.okuCard}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">No. Akaun Cukai Taksiran</p>
                        <p className="font-semibold">{result.taxAccount || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">No. Kereta</p>
                        <p className="font-mono font-semibold">{result.carReg}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Tarikh Mohon</p>
                        <p className="font-semibold">{result.submittedDate}</p>
                      </div>
                    </div>
                  </div>

                  {/* Status Message */}
                  {result.status === 'Telah Diambil' && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-purple-800 text-center">
                        <CheckCircle className="inline h-5 w-5 mr-2" />
                        Pelekat telah diambil. Terima kasih!
                      </p>
                    </div>
                  )}

                  {result.status === 'Sedia Diambil' && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-800 text-center mb-2">
                        Pelekat anda sudah sedia untuk diambil di Pejabat MPHS
                      </p>
                      <p className="text-blue-700 text-center text-sm">
                        Sila bawa kad pengenalan, kad OKU dan stiker lama ke MPHS
                      </p>
                    </div>
                  )}

                  {/* Enhanced Expiry Date Display */}
                  {(result.status === 'Diluluskan' || result.status === 'Sedia Diambil' || result.status === 'Telah Diambil') && result.expiryDate && (() => {
                    const timeRemaining = calculateTimeRemaining(result.expiryDate, result.approvedDate);
                    const isExpired = timeRemaining.expired;
                    const nearExpiry = !isExpired && timeRemaining.days <= 60; // Within 2 months
                    
                    return (
                      <div className={`p-6 border-2 rounded-lg ${
                        isExpired 
                          ? 'bg-red-50 border-red-300' 
                          : nearExpiry
                          ? 'bg-amber-50 border-amber-300'
                          : 'bg-green-50 border-green-300'
                      }`}>
                        <div className="space-y-4">
                          {/* Header */}
                          <div className="text-center border-b pb-3">
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <Calendar className={`h-6 w-6 ${
                                isExpired ? 'text-red-600' : nearExpiry ? 'text-amber-600' : 'text-green-600'
                              }`} />
                              <h3 className={`text-lg font-bold ${
                                isExpired ? 'text-red-900' : nearExpiry ? 'text-amber-900' : 'text-green-900'
                              }`}>
                                {isExpired ? '⚠️ STIKER TAMAT TEMPOH' : nearExpiry ? '⚠️ STIKER HAMPIR TAMAT' : '✅ STIKER MASIH SAH'}
                              </h3>
                            </div>
                          </div>

                          {/* Dates Info */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {result.approvedDate && (
                              <div className="text-center p-3 bg-white/50 rounded">
                                <p className="text-muted-foreground mb-1">Tarikh Kelulusan</p>
                                <p className="font-semibold">{result.approvedDate}</p>
                              </div>
                            )}
                            <div className="text-center p-3 bg-white/50 rounded">
                              <p className="text-muted-foreground mb-1">
                                {isExpired ? 'Tamat Tempoh' : 'Sah Sehingga'}
                              </p>
                              <p className="font-semibold">{result.expiryDateDisplay}</p>
                            </div>
                          </div>

                          {/* Time Remaining */}
                          <div className={`text-center p-4 rounded-lg ${
                            isExpired 
                              ? 'bg-red-100' 
                              : nearExpiry 
                              ? 'bg-amber-100' 
                              : 'bg-green-100'
                          }`}>
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <Clock className={`h-5 w-5 ${
                                isExpired ? 'text-red-700' : nearExpiry ? 'text-amber-700' : 'text-green-700'
                              }`} />
                              <p className={`text-sm font-semibold ${
                                isExpired ? 'text-red-700' : nearExpiry ? 'text-amber-700' : 'text-green-700'
                              }`}>
                                {isExpired ? 'Tempoh Tamat' : 'Baki Tempoh'}
                              </p>
                            </div>
                            <p className={`text-2xl font-bold ${
                              isExpired ? 'text-red-900' : nearExpiry ? 'text-amber-900' : 'text-green-900'
                            }`}>
                              {timeRemaining.text || 'Mengira...'}
                            </p>
                          </div>

                          {/* Status Message */}
                          <div className={`text-center p-3 rounded ${
                            isExpired 
                              ? 'bg-red-100 text-red-800' 
                              : nearExpiry 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            <p className="text-sm font-medium">
                              {isExpired 
                                ? '⚠️ Stiker anda telah tamat tempoh.'
                                : nearExpiry
                                ? '⚠️ Stiker anda akan tamat tempoh tidak lama lagi. Anda boleh buat pembaharuan sekarang.'
                                : 'Stiker anda masih sah.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Action Buttons Based on Status */}
              <div className="pt-4 border-t space-y-3">
                {result ? (
                  // User ada rekod - tunjuk button mengikut status
                  <>
                    {result.status === 'Dalam Proses' && (
                      <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <Clock className="h-6 w-6 text-blue-600 animate-pulse" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-blue-900 mb-2">⏳ PERMOHONAN SEDANG DIPROSES</h4>
                            <p className="text-sm text-blue-800 mb-3">
                              Permohonan anda sedang disemak oleh pihak pentadbir. 
                              Sila tunggu keputusan dalam masa 5 hari bekerja.
                            </p>
                            <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
                              <p className="font-semibold mb-1">Anda akan dimaklumkan melalui:</p>
                              <p>• Status akan dinyatakan apabila permohonan diluluskan</p>
                              <p>• Status stiker sedia untuk diambil</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {(result.status === 'Diluluskan' || result.status === 'Sedia Diambil' || result.status === 'Telah Diambil') && result.expiryDate && (() => {
                      const timeRemaining = calculateTimeRemaining(result.expiryDate, result.approvedDate);
                      const canRenewNow = canRenew(result.expiryDate, result.approvedDate);
                      
                      return canRenewNow ? (
                        <Button 
                          className="w-full"
                          size="lg"
                          onClick={() => {
                            console.log('🔄 Navigating to Pembaharuan page...');
                            sessionStorage.setItem('applicantIC', icNumber);
                            router.push('/permohonan/pembaharuan');
                          }}
                        >
                          {timeRemaining.expired ? 'Permohonan Pembaharuan' : 'Permohonan Pembaharuan'} →
                        </Button>
                      ) : (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                          <p className="text-sm text-gray-700">
                            ℹ️ Pembaharuan boleh dibuat sebulan sebelum tamat tempoh
                          </p>
                        </div>
                      );
                    })()}
                    
                    {(result.status === 'Tidak Berjaya' || result.status === 'Tidak Lengkap') && (
                      <>
                        {result.adminNotes && (
                          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm font-semibold text-red-800 mb-1">Sebab Permohonan Ditolak:</p>
                            <p className="text-sm text-red-700">{result.adminNotes}</p>
                          </div>
                        )}
                        <Button 
                          className="w-full"
                          size="lg"
                          onClick={() => {
                            console.log('🔄 Kemaskini permohonan - Navigating to Pembaharuan page...');
                            sessionStorage.setItem('applicantIC', icNumber);
                            router.push('/permohonan/pembaharuan');
                          }}
                        >
                          Kemaskini Permohonan →
                        </Button>
                      </>
                    )}
                  </>
                ) : (
                  // Tiada rekod - user baharu
                  <Button 
                    variant="outline" 
                    className="w-full"
                    size="lg"
                    onClick={() => {
                      console.log('🆕 User baharu - Navigating to Baharu page...');
                      sessionStorage.setItem('applicantIC', icNumber);
                      router.push('/permohonan/baharu');
                    }}
                  >
                    Pendaftaran Baharu →
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
