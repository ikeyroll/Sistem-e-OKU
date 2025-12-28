"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Upload, CheckCircle, AlertCircle, Info, Trash2 } from 'lucide-react';
import { createApplication, generateRefNumber, uploadFile } from '@/lib/api/applications';
import { MapPicker } from '@/components/MapPicker';
import { loadBoundaryGeoJSON, isPointInsideGeoJSON } from '@/lib/geo';

export default function PendaftaranBaharu() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    // Jenis Permohonan (auto-set to 'baru')
    applicationType: 'baru' as 'baru' | 'pembaharuan',
    
    // Maklumat Pemohon
    pemohonName: '',
    pemohonIC: '',
    pemohonOKUCard: '',
    pemohonTaxAccount: '',
    // Address components
    pemohonStreet: '',
    pemohonCarReg: '',
    pemohonPhone: '',
    pemohonOKUCategory: '',
    
    // Maklumat Tanggungan (optional)
    isTanggungan: false,
    tanggunganName: '',
    tanggunganRelation: '',
    tanggunganCompany: '',
    tanggunganIC: '',
  });
  
  // Confirmation checkbox state
  const [confirmDeclaration, setConfirmDeclaration] = useState(false);
  
  // Geo fields (auto-sync with map)
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [daerah, setDaerah] = useState<string | undefined>(undefined);
  const [mukim, setMukim] = useState<string | undefined>(undefined);
  // District boundary and validation
  const [boundary, setBoundary] = useState<any | null>(null);
  const [boundaryLoaded, setBoundaryLoaded] = useState<boolean>(false);
  const [isInsideDistrict, setIsInsideDistrict] = useState<boolean>(true);
  
  const [documents, setDocuments] = useState({
    icCopy: null as File | null,
    okuCard: null as File | null,
    drivingLicense: null as File | null,
    passportPhoto: null as File | null,
  });

  useEffect(() => {
    // Get IC from sessionStorage
    const ic = sessionStorage.getItem('applicantIC');
    if (ic) {
      // Format IC number (accept both formats)
      const formattedIC = formatICNumber(ic);
      setFormData(prev => ({ ...prev, pemohonIC: formattedIC }));
    }
  }, []);

  // Load Hulu Selangor boundary once
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_HULU_SELANGOR_GEOJSON_URL as string | undefined;
    if (!url) {
      console.warn('Hulu Selangor GeoJSON URL is not configured.');
      setBoundaryLoaded(false);
      return;
    }
    loadBoundaryGeoJSON(url)
      .then((gj) => {
        setBoundary(gj);
        setBoundaryLoaded(!!gj);
        console.log('Boundary loaded:', gj?.type, Array.isArray((gj as any)?.features) ? (gj as any).features.length : 'n/a');
      })
      .catch((err) => {
        console.error('Failed to load boundary', err);
        setBoundary(null);
        setBoundaryLoaded(false);
      });
  }, []);

  // Recompute inside/outside when coordinates change
  useEffect(() => {
    if (latitude == null || longitude == null) return;
    if (!boundary) return;
    const inside = isPointInsideGeoJSON({ lat: latitude, lon: longitude }, boundary);
    console.log('Boundary check:', { lat: latitude, lon: longitude, inside });
    setIsInsideDistrict(inside);
  }, [latitude, longitude, boundary]);

  // Format IC number to standard format (850215-10-5432)
  const formatICNumber = (ic: string) => {
    // Remove all non-digits
    const digits = ic.replace(/\D/g, '');
    
    // Format as XXXXXX-XX-XXXX
    if (digits.length === 12) {
      return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
    }
    
    return ic; // Return as-is if not 12 digits
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isTanggungan: checked }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: keyof typeof documents) => {
    if (e.target.files && e.target.files[0]) {
      setDocuments(prev => ({ ...prev, [type]: e.target.files![0] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if IC has been validated
    if (!formData.pemohonIC) {
      toast.error('Sila semak No. Kad Pengenalan terlebih dahulu');
      return;
    }
    
    // Validation - Maklumat Pemohon (WAJIB)
    if (!formData.pemohonName || !formData.pemohonIC || !formData.pemohonOKUCard || !formData.pemohonTaxAccount ||
        !formData.pemohonStreet || !formData.pemohonCarReg || !formData.pemohonPhone || !formData.pemohonOKUCategory) {
      toast.error('Sila lengkapkan semua maklumat pemohon yang diwajibkan');
      return;
    }

    // Validation - Maklumat Tanggungan (if checked)
    if (formData.isTanggungan) {
      if (!formData.tanggunganName || !formData.tanggunganRelation || !formData.tanggunganIC) {
        toast.error('Sila lengkapkan maklumat tanggungan');
        return;
      }
    }
    
    // Validation - Confirmation checkbox
    if (!confirmDeclaration) {
      toast.error('Sila tandakan kotak pengesahan sebelum menghantar permohonan');
      return;
    }

    // Validation - Documents (WAJIB)
    if (!documents.icCopy || !documents.okuCard || !documents.drivingLicense || !documents.passportPhoto) {
      toast.error('Sila muat naik semua dokumen yang diwajibkan');
      return;
    }

    // Validation - File sizes (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    const fileSizeErrors = [];
    
    if (documents.icCopy && documents.icCopy.size > maxSize) {
      fileSizeErrors.push('Salinan Kad Pengenalan');
    }
    if (documents.okuCard && documents.okuCard.size > maxSize) {
      fileSizeErrors.push('Kad OKU');
    }
    if (documents.drivingLicense && documents.drivingLicense.size > maxSize) {
      fileSizeErrors.push('Lesen Memandu');
    }
    if (documents.passportPhoto && documents.passportPhoto.size > maxSize) {
      fileSizeErrors.push('Gambar Pasport');
    }
    
    if (fileSizeErrors.length > 0) {
      toast.error(`Dokumen melebihi had 5MB: ${fileSizeErrors.join(', ')}`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Check for duplicate OKU Card and Car Registration
      toast.info('Memeriksa maklumat...');
      const { supabase } = await import('@/lib/supabase');
      
      const { data: existingApps, error: checkError } = await supabase
        .from('applications')
        .select('pemohon')
        .or(`pemohon->>okuCard.eq.${formData.pemohonOKUCard},pemohon->>carReg.eq.${formData.pemohonCarReg}`);
      
      if (checkError) {
        console.error('Error checking duplicates:', checkError);
      }
      
      if (existingApps && existingApps.length > 0) {
        const duplicateFields = [];
        
        for (const app of existingApps) {
          const pemohon = app.pemohon as any;
          if (pemohon.okuCard === formData.pemohonOKUCard) {
            duplicateFields.push('No. Kad OKU');
          }
          if (pemohon.carReg === formData.pemohonCarReg) {
            duplicateFields.push('No. Pendaftaran Kereta');
          }
        }
        
        if (duplicateFields.length > 0) {
          const uniqueFields = [...new Set(duplicateFields)];
          toast.error(`Maklumat berikut telah didaftarkan: ${uniqueFields.join(', ')}`);
          setIsSubmitting(false);
          return;
        }
      }
      
      // 1. Generate reference number
      const refNo = await generateRefNumber('baru');
      toast.info('Generating reference number...');
      
      // 2. Upload documents to Supabase Storage
      toast.info('Uploading documents...');
      const uploadedDocs = {
        icCopy: await uploadFile(documents.icCopy!, `${refNo}/ic-copy`),
        okuCard: await uploadFile(documents.okuCard!, `${refNo}/oku-card`),
        drivingLicense: await uploadFile(documents.drivingLicense!, `${refNo}/license`),
        passportPhoto: await uploadFile(documents.passportPhoto!, `${refNo}/photo`),
      };
      
      // 3. Prepare application data
      const applicationData = {
        ref_no: refNo,
        application_type: 'baru' as const,
        pemohon: {
          name: formData.pemohonName,
          ic: formData.pemohonIC,
          okuCard: formData.pemohonOKUCard,
          taxAccount: formData.pemohonTaxAccount,
          phone: formData.pemohonPhone,
          carReg: formData.pemohonCarReg,
          okuCategory: formData.pemohonOKUCategory,
          address: {
            street: formData.pemohonStreet,
            mukim: mukim || '',
            daerah: daerah || 'Hulu Selangor',
            poskod: '',
            negeri: 'Selangor',
            full_address: formData.pemohonStreet
          },
        },
        tanggungan: formData.isTanggungan ? {
          name: formData.tanggunganName,
          relation: formData.tanggunganRelation,
          ic: formData.tanggunganIC,
          company: formData.tanggunganCompany,
        } : undefined,
        documents: uploadedDocs,
        status: 'Dalam Proses' as const,
        submitted_date: new Date().toISOString(),
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        daerah,
        mukim,
      };
      
      // 4. Save to Supabase
      toast.info('Saving application...');
      await createApplication(applicationData);
      
      // 5. Store in sessionStorage
      sessionStorage.setItem('lastRefNo', refNo);
      
      toast.success('Permohonan berjaya dihantar!');
      
      // 6. Redirect to success page
      router.push(`/permohonan/berjaya?ref=${formData.pemohonIC}&type=new`);
    } catch (error: any) {
      console.error('Error submitting application:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Ralat semasa menghantar permohonan';
      if (error.message) {
        if (error.message.includes('Storage')) {
          errorMessage = 'Ralat semasa memuat naik dokumen. Sila cuba lagi.';
        } else if (error.message.includes('duplicate') || error.message.includes('already exists')) {
          errorMessage = 'Permohonan dengan maklumat yang sama sudah wujud.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Masalah rangkaian. Sila semak sambungan internet dan cuba lagi.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen py-12 bg-gradient-to-br from-primary/5 to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Borang Permohonan Pelekat Kenderaan OKU</h1>
            <p className="text-muted-foreground">Majlis Perbandaran Hulu Selangor</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Jenis Permohonan - Auto Selected */}
            <Card>
              <CardHeader>
                <CardTitle>Jenis Permohonan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input 
                      type="radio" 
                      name="applicationType" 
                      value="baru"
                      checked={formData.applicationType === 'baru'}
                      disabled
                      className="mr-2"
                    />
                    <span className="font-medium">☑ Baru</span>
                  </label>
                  <label className="flex items-center opacity-50">
                    <input 
                      type="radio" 
                      name="applicationType" 
                      value="pembaharuan"
                      checked={formData.applicationType === 'pembaharuan'}
                      disabled
                      className="mr-2"
                    />
                    <span>Pembaharuan</span>
                  </label>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  <Info className="w-4 h-4 inline mr-1" />
                  Jenis permohonan telah dipilih berdasarkan semakan IC anda
                </p>
              </CardContent>
            </Card>

            {/* a) Maklumat Pemohon - WAJIB */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>a) Maklumat Pemohon</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-red-600 font-medium">WAJIB DIISI</span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pemohonName">Nama Pemohon OKU *</Label>
                    <Input
                      id="pemohonName"
                      name="pemohonName"
                      value={formData.pemohonName}
                      onChange={handleInputChange}
                      placeholder="Ahmad bin Ali"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="pemohonIC">No. Kad Pengenalan *</Label>
                    <Input
                      id="pemohonIC"
                      name="pemohonIC"
                      value={formData.pemohonIC}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Format: 850215-10-5432 atau 850215105432
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="pemohonOKUCard">No. Kad OKU *</Label>
                    <Input
                      id="pemohonOKUCard"
                      name="pemohonOKUCard"
                      value={formData.pemohonOKUCard}
                      onChange={handleInputChange}
                      placeholder="OKU123456"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="pemohonTaxAccount">No Akaun Cukai Taksiran</Label>
                    <Input
                      id="pemohonTaxAccount"
                      name="pemohonTaxAccount"
                      value={formData.pemohonTaxAccount}
                      onChange={handleInputChange}
                      placeholder="Contoh: T00947903"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pemohonCarReg">No. Pendaftaran Kereta *</Label>
                    <Input
                      id="pemohonCarReg"
                      name="pemohonCarReg"
                      value={formData.pemohonCarReg}
                      onChange={handleInputChange}
                      placeholder="WXY1234"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="pemohonPhone">No. Tel *</Label>
                    <Input
                      id="pemohonPhone"
                      name="pemohonPhone"
                      type="tel"
                      value={formData.pemohonPhone}
                      onChange={handleInputChange}
                      placeholder="0123456789"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="pemohonOKUCategory">Kategori OKU *</Label>
                    <Select value={formData.pemohonOKUCategory} onValueChange={(value) => setFormData({...formData, pemohonOKUCategory: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Kategori OKU" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kurang Upaya Pendengaran">Kurang Upaya Pendengaran</SelectItem>
                        <SelectItem value="Kurang Upaya Penglihatan">Kurang Upaya Penglihatan</SelectItem>
                        <SelectItem value="Kurang Upaya Pertuturan">Kurang Upaya Pertuturan</SelectItem>
                        <SelectItem value="Kurang Upaya Fizikal">Kurang Upaya Fizikal</SelectItem>
                        <SelectItem value="Kurang Upaya Pembelajaran">Kurang Upaya Pembelajaran</SelectItem>
                        <SelectItem value="Kurang Upaya Mental">Kurang Upaya Mental</SelectItem>
                        <SelectItem value="Kurang Upaya Pelbagai">Kurang Upaya Pelbagai</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="pemohonStreet">Alamat *</Label>
                    <Input
                      id="pemohonStreet"
                      name="pemohonStreet"
                      value={formData.pemohonStreet}
                      onChange={async (e) => {
                        handleInputChange(e);
                        
                        // Auto-pin based on address using our location matcher
                        const address = e.target.value;
                        if (address.length > 10) {
                          try {
                            const { extractCoordinatesFromAddress } = await import('@/lib/locationMatcher');
                            const fullAddress = `${address}, ${mukim || ''}, ${daerah || 'Hulu Selangor'}, Selangor`;
                            const coords = extractCoordinatesFromAddress(fullAddress, mukim, daerah);
                            
                            if (coords) {
                              console.log('✅ Auto-pin from address:', coords);
                              setLatitude(coords.lat);
                              setLongitude(coords.lon);
                            } else {
                              console.log('⚠️ No match found for address, keeping current pin');
                            }
                          } catch (err) {
                            console.error('Auto-pin error:', err);
                          }
                        }
                      }}
                      placeholder="No 123, Jalan Merdeka, Taman Sejahtera"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      📍 Pin akan muncul automatik berdasarkan alamat. Anda boleh seret pin untuk betulkan lokasi.
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="mb-2 block">Lokasi Pada Peta *</Label>
                    <MapPicker
                      lat={latitude ?? undefined}
                      lon={longitude ?? undefined}
                      invalid={boundaryLoaded && !isInsideDistrict}
                      showInstructions={true}
                      onLocationChange={(loc) => {
                        // Only update coordinates, don't change address field
                        setLatitude(loc.lat);
                        setLongitude(loc.lon);
                        if (loc.daerah) setDaerah(loc.daerah);
                        if (loc.mukim) setMukim(loc.mukim);
                      }}
                    />
                    {!isInsideDistrict && (
                      <p className="mt-2 text-sm text-red-600">
                        Lokasi di luar daerah Hulu Selangor. Sila pilih lokasi dalam kawasan Hulu Selangor.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>b) Maklumat Tanggungan</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <Info className="w-4 h-4 text-blue-500" />
                      <span className="text-blue-600 font-medium">PILIHAN (Jika Tanggungan Pemohon Adalah OKU)</span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="isTanggungan"
                    checked={formData.isTanggungan}
                    onCheckedChange={handleCheckboxChange}
                    className="h-5 w-5 border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <label
                    htmlFor="isTanggungan"
                    className="text-base font-medium leading-none cursor-pointer"
                  >
                    Penjaga kepada OKU
                  </label>
                </div>

                {formData.isTanggungan && (
                  <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <Label htmlFor="tanggunganName">Nama Penjaga *</Label>
                      <Input
                        id="tanggunganName"
                        name="tanggunganName"
                        value={formData.tanggunganName}
                        onChange={handleInputChange}
                        placeholder="Nama penjaga/wali"
                        required={formData.isTanggungan}
                      />
                    </div>
                    <div>
                      <Label htmlFor="tanggunganRelation">Hubungan *</Label>
                      <Input
                        id="tanggunganRelation"
                        name="tanggunganRelation"
                        value={formData.tanggunganRelation}
                        onChange={handleInputChange}
                        placeholder="Contoh: Ibu, Bapa, Adik"
                        required={formData.isTanggungan}
                      />
                    </div>
                    <div>
                      <Label htmlFor="tanggunganCompany">Nama Persatuan</Label>
                      <Input
                        id="tanggunganCompany"
                        name="tanggunganCompany"
                        value={formData.tanggunganCompany}
                        onChange={handleInputChange}
                        placeholder="Nama persatuan (jika ada)"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tanggunganIC">No. Kad Pengenalan Penjaga *</Label>
                      <Input
                        id="tanggunganIC"
                        name="tanggunganIC"
                        value={formData.tanggunganIC}
                        onChange={handleInputChange}
                        placeholder="850215-10-5432"
                        required={formData.isTanggungan}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dokumen Diperlukan - WAJIB */}
            <Card className="border-l-4 border-l-red-500">
              <CardHeader>
                <CardTitle>Dokumen Diperlukan</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-red-600 font-medium">SEMUA DOKUMEN WAJIB DIMUAT NAIK</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="icCopy">Satu (1) Salinan Kad Pengenalan atau Sijil Kelahiran Pemohon / Tanggungan *</Label>
                  <Input
                    id="icCopy"
                    type="file"
                    accept="image/*,.pdf,.png,.jpg,.jpeg"
                    capture="environment"
                    onChange={(e) => handleFileChange(e, 'icCopy')}
                    required={!documents.icCopy}
                    className="mt-2"
                  />
                  {documents.icCopy && (
                    <div className="flex items-center justify-between mt-1 p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm text-green-600 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {documents.icCopy.name}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDocuments(prev => ({ ...prev, icCopy: null }))}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Padam Dokumen
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="okuCard">Satu (1) Salinan Kad OKU Pemohon / Tanggungan *</Label>
                  <Input
                    id="okuCard"
                    type="file"
                    accept="image/*,.pdf,.png,.jpg,.jpeg"
                    capture="environment"
                    onChange={(e) => handleFileChange(e, 'okuCard')}
                    required={!documents.okuCard}
                    className="mt-2"
                  />
                  {documents.okuCard && (
                    <div className="flex items-center justify-between mt-1 p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm text-green-600 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {documents.okuCard.name}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDocuments(prev => ({ ...prev, okuCard: null }))}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Padam Dokumen
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="drivingLicense">Satu (1) Salinan Lesen Memandu Pemohon *</Label>
                  <Input
                    id="drivingLicense"
                    type="file"
                    accept="image/*,.pdf,.png,.jpg,.jpeg"
                    capture="environment"
                    onChange={(e) => handleFileChange(e, 'drivingLicense')}
                    required={!documents.drivingLicense}
                    className="mt-2"
                  />
                  {documents.drivingLicense && (
                    <div className="flex items-center justify-between mt-1 p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm text-green-600 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {documents.drivingLicense.name}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDocuments(prev => ({ ...prev, drivingLicense: null }))}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Padam Dokumen
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="passportPhoto">Sekeping Gambar Ukuran Pasport OKU *</Label>
                  <Input
                    id="passportPhoto"
                    type="file"
                    accept="image/*,.pdf,.png,.jpg,.jpeg"
                    capture="environment"
                    onChange={(e) => handleFileChange(e, 'passportPhoto')}
                    required={!documents.passportPhoto}
                    className="mt-2"
                  />
                  {documents.passportPhoto && (
                    <div className="flex items-center justify-between mt-1 p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm text-green-600 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {documents.passportPhoto.name}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDocuments(prev => ({ ...prev, passportPhoto: null }))}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Padam Dokumen
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Confirmation Checkbox */}
            <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <Checkbox 
                id="confirmDeclaration"
                checked={confirmDeclaration}
                onCheckedChange={(checked) => setConfirmDeclaration(checked as boolean)}
                className="h-6 w-6 mt-1 border-2 border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <label
                htmlFor="confirmDeclaration"
                className="text-base leading-relaxed cursor-pointer flex-1"
              >
                Saya dengan ini mengesahkan bahawa semua maklumat yang diberikan adalah benar, tepat dan terkini. Sekiranya kenyataan dan dokumen yang diberikan tidak benar atau permohonan ini tidak lengkap, pihak MPHS berhak membatalkan permohonan ini. <span className="text-red-600 font-medium">(Wajib)</span>
              </label>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Kembali
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting || !boundaryLoaded || !isInsideDistrict}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menghantar Permohonan...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Hantar Permohonan
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
