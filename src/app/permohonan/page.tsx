
"use client";

import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/contexts/LanguageContext';
import { Upload, CheckCircle, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PermohonanPage() {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [refNumber, setRefNumber] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    icNumber: '',
    okuNumber: '',
    phone: '',
    email: '',
    address: '',
    plateNumber: '',
    vehicleType: '',
  });
  const [files, setFiles] = useState({
    icCopy: null as File | null,
    okuCard: null as File | null,
    grant: null as File | null,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [field]: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      const generatedRef = `OKU${Date.now().toString().slice(-8)}`;
      setRefNumber(generatedRef);
      setSubmitted(true);
      setLoading(false);
    }, 2000);
  };

  if (submitted) {
    return (
      <>
        <Header />
        <main className="min-h-screen py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
              <Card className="border-2 border-primary">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{t('form.success')}</CardTitle>
                  <CardDescription>
                    {language === 'ms' 
                      ? 'Permohonan anda telah berjaya dihantar. Sila simpan nombor rujukan ini.'
                      : 'Your application has been successfully submitted. Please save this reference number.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-muted p-6 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground mb-2">{t('form.refNumberLabel')}</p>
                    <p className="text-3xl font-bold font-mono">{refNumber}</p>
                  </div>
                  <Alert>
                    <AlertDescription>
                      {language === 'ms'
                        ? 'Anda akan menerima notifikasi WhatsApp apabila permohonan anda telah diproses. Proses semakan mengambil masa 5 hari bekerja.'
                        : 'You will receive a WhatsApp notification when your application has been processed. Review takes 5 working days.'}
                    </AlertDescription>
                  </Alert>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button variant="outline" className="flex-1" onClick={() => {
                      setSubmitted(false);
                      setFormData({
                        fullName: '',
                        icNumber: '',
                        okuNumber: '',
                        phone: '',
                        email: '',
                        address: '',
                        plateNumber: '',
                        vehicleType: '',
                      });
                      setFiles({
                        icCopy: null,
                        okuCard: null,
                        grant: null,
                      });
                    }}>
                      {language === 'ms' ? 'Permohonan Baru' : 'New Application'}
                    </Button>
                    <Button className="flex-1" onClick={() => window.location.href = '/'}>
                      {language === 'ms' ? 'Kembali ke Laman Utama' : 'Back to Home'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">{t('form.title')}</h1>
              <p className="text-muted-foreground">
                {language === 'ms'
                  ? 'Sila lengkapkan borang di bawah untuk memohon pelekat OKU'
                  : 'Please complete the form below to apply for an OKU sticker'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('form.personalInfo')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">{t('form.fullName')} *</Label>
                      <Input
                        id="fullName"
                        required
                        value={formData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="icNumber">{t('form.icNumber')} *</Label>
                      <Input
                        id="icNumber"
                        required
                        placeholder="XXXXXX-XX-XXXX"
                        value={formData.icNumber}
                        onChange={(e) => handleInputChange('icNumber', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="okuNumber">{t('form.okuNumber')} *</Label>
                      <Input
                        id="okuNumber"
                        required
                        value={formData.okuNumber}
                        onChange={(e) => handleInputChange('okuNumber', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t('form.phone')} *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        required
                        placeholder="01X-XXXXXXX"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{t('form.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">{t('form.address')} *</Label>
                    <Textarea
                      id="address"
                      required
                      rows={3}
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Information */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('form.vehicleInfo')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="plateNumber">{t('form.plateNumber')} *</Label>
                      <Input
                        id="plateNumber"
                        required
                        placeholder="ABC 1234"
                        value={formData.plateNumber}
                        onChange={(e) => handleInputChange('plateNumber', e.target.value.toUpperCase())}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicleType">{t('form.vehicleType')} *</Label>
                      <Select
                        value={formData.vehicleType}
                        onValueChange={(value) => handleInputChange('vehicleType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={language === 'ms' ? 'Pilih jenis kenderaan' : 'Select vehicle type'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="car">{language === 'ms' ? 'Kereta' : 'Car'}</SelectItem>
                          <SelectItem value="motorcycle">{language === 'ms' ? 'Motosikal' : 'Motorcycle'}</SelectItem>
                          <SelectItem value="van">{language === 'ms' ? 'Van' : 'Van'}</SelectItem>
                          <SelectItem value="truck">{language === 'ms' ? 'Lori' : 'Truck'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Documents Upload */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('form.documents')}</CardTitle>
                  <CardDescription>
                    {language === 'ms'
                      ? 'Format: JPG, PNG, PDF (Max 5MB setiap fail)'
                      : 'Format: JPG, PNG, PDF (Max 5MB per file)'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="icCopy">{t('form.icCopy')} *</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="icCopy"
                        type="file"
                        accept="image/*,.pdf"
                        required
                        onChange={(e) => handleFileChange('icCopy', e.target.files?.[0] || null)}
                        className="flex-1"
                      />
                      {files.icCopy && <CheckCircle className="h-5 w-5 text-primary" />}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="okuCard">{t('form.okuCard')} *</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="okuCard"
                        type="file"
                        accept="image/*,.pdf"
                        required
                        onChange={(e) => handleFileChange('okuCard', e.target.files?.[0] || null)}
                        className="flex-1"
                      />
                      {files.okuCard && <CheckCircle className="h-5 w-5 text-primary" />}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grant">{t('form.grant')} *</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="grant"
                        type="file"
                        accept="image/*,.pdf"
                        required
                        onChange={(e) => handleFileChange('grant', e.target.files?.[0] || null)}
                        className="flex-1"
                      />
                      {files.grant && <CheckCircle className="h-5 w-5 text-primary" />}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button type="submit" size="lg" disabled={loading} className="w-full sm:w-auto">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('form.submitting')}
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {t('form.submit')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
