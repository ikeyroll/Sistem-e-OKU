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
import { Loader2, Upload, CheckCircle, AlertCircle, Info, FileText, Image as ImageIcon, Edit, Check, RefreshCw, Trash2 } from 'lucide-react';
import { createApplication, generateRefNumber, uploadFile, getApplicationByIC } from '@/lib/api/applications';
import type { Application } from '@/lib/supabase';
import { DocumentPreview } from '@/components/DocumentPreview';
import { MapPicker } from '@/components/MapPicker';
import { loadBoundaryGeoJSON, isPointInsideGeoJSON } from '@/lib/geo';

export default function PembaharuanPermohonan() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [existingApp, setExistingApp] = useState<Application | null>(null);
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  
  // Edit mode for each section
  const [editMode, setEditMode] = useState({
    pemohon: false,
    tanggungan: false,
    documents: false,
  });
  
  // Geo fields (auto-sync with map)
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [daerah, setDaerah] = useState<string | undefined>(undefined);
  const [mukim, setMukim] = useState<string | undefined>(undefined);
  // District boundary and validation
  const [boundary, setBoundary] = useState<any | null>(null);
  const [isInsideDistrict, setIsInsideDistrict] = useState<boolean>(true);
  
  const [formData, setFormData] = useState({
    // Jenis Permohonan (auto-set to 'pembaharuan')
    applicationType: 'pembaharuan' as 'baru' | 'pembaharuan',
    
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
  
  // Existing documents from database
  const [existingDocuments, setExistingDocuments] = useState({
    icCopy: null as string | null,
    okuCard: null as string | null,
    drivingLicense: null as string | null,
    passportPhoto: null as string | null,
  });
  
  // New documents to upload (optional for renewal)
  const [newDocuments, setNewDocuments] = useState({
    icCopy: null as File | null,
    okuCard: null as File | null,
    drivingLicense: null as File | null,
    passportPhoto: null as File | null,
    oldSticker: null as File | null,
  });

  useEffect(() => {
    // Get IC from sessionStorage
    const ic = sessionStorage.getItem('applicantIC');
    if (ic) {
      loadExistingData(ic);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Load Hulu Selangor boundary once
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_HULU_SELANGOR_GEOJSON_URL as string | undefined;
    if (!url) return;
    loadBoundaryGeoJSON(url).then(setBoundary).catch(() => setBoundary(null));
  }, []);

  // Recompute inside/outside when coordinates change
  useEffect(() => {
    if (latitude == null || longitude == null) return;
    if (!boundary) return;
    const inside = isPointInsideGeoJSON({ lat: latitude, lon: longitude }, boundary);
    setIsInsideDistrict(inside);
  }, [latitude, longitude, boundary]);

  const loadExistingData = async (ic: string) => {
    setIsLoading(true);
    console.log('🔄 Loading existing data for IC:', ic);
    
    try {
      const cleanIC = ic.replace(/[-\s]/g, '');
      
      // Get existing application from database
      const app = await getApplicationByIC(cleanIC);
      console.log('✅ Existing application found:', app.ref_no);
      
      setExistingApp(app);
      
      // Parse pemohon data
      const pemohon = typeof app.pemohon === 'string' ? JSON.parse(app.pemohon) : app.pemohon;
      const tanggungan = app.tanggungan ? (typeof app.tanggungan === 'string' ? JSON.parse(app.tanggungan) : app.tanggungan) : null;
      
      // Auto-fill form with existing data
      setFormData({
        applicationType: 'pembaharuan',
        pemohonName: pemohon.name || '',
        pemohonIC: pemohon.ic || '',
        pemohonOKUCard: pemohon.okuCard || '',
        pemohonTaxAccount: pemohon.taxAccount || '',
        // Handle both old string format and new object format
        pemohonStreet: typeof pemohon.address === 'object' ? pemohon.address.street || '' : pemohon.address || '',
        pemohonCarReg: pemohon.carReg || '',
        pemohonPhone: pemohon.phone || '',
        pemohonOKUCategory: pemohon.okuCategory || '',
        isTanggungan: !!tanggungan,
        tanggunganName: tanggungan?.name || '',
        tanggunganRelation: tanggungan?.relation || '',
        tanggunganCompany: tanggungan?.company || '',
        tanggunganIC: tanggungan?.ic || '',
      });
      
      // Load existing documents
      const docs = app.documents || {};
      setExistingDocuments({
        icCopy: docs.icCopy || null,
        okuCard: docs.okuCard || null,
        drivingLicense: docs.drivingLicense || null,
        passportPhoto: docs.passportPhoto || null,
      });
      
      toast.success('Data sedia ada telah dimuatkan');
    } catch (error) {
      console.error('Failed to load existing data:', error);
      toast.error('Ralat: Tiada rekod dijumpai. Sila buat permohonan baharu.');
      router.push('/permohonan/baharu');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Track field changes
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    setChangedFields(prev => new Set(prev).add(fieldName));
  };

  // Format IC number to standard format (850215-10-5432)
  const formatICNumber = (ic: string) => {
    const digits = ic.replace(/\D/g, '');
    if (digits.length === 12) {
      return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
    }
    return ic;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isTanggungan: checked }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: keyof typeof newDocuments) => {
    if (e.target.files && e.target.files[0]) {
      setNewDocuments(prev => ({ ...prev, [type]: e.target.files![0] }));
    }
  };

  const toggleEditMode = (section: 'pemohon' | 'tanggungan' | 'documents') => {
    setEditMode(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isInsideDistrict) {
      toast.error('Lokasi di luar daerah Hulu Selangor. Sila pilih lokasi dalam kawasan Hulu Selangor.');
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

    // Validation - File sizes (max 5MB) for new documents
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    const fileSizeErrors = [];
    
    if (newDocuments.icCopy && newDocuments.icCopy.size > maxSize) {
      fileSizeErrors.push('Salinan Kad Pengenalan');
    }
    if (newDocuments.okuCard && newDocuments.okuCard.size > maxSize) {
      fileSizeErrors.push('Kad OKU');
    }
    if (newDocuments.drivingLicense && newDocuments.drivingLicense.size > maxSize) {
      fileSizeErrors.push('Lesen Memandu');
    }
    if (newDocuments.passportPhoto && newDocuments.passportPhoto.size > maxSize) {
      fileSizeErrors.push('Gambar Pasport');
    }
    
    if (fileSizeErrors.length > 0) {
      toast.error(`Dokumen melebihi had 5MB: ${fileSizeErrors.join(', ')}`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Check for duplicate OKU Card, Tax Account, and Car Registration (excluding current application)
      toast.info('Memeriksa maklumat...');
      const { supabase } = await import('@/lib/supabase');
      
      const { data: existingApps, error: checkError } = await supabase
        .from('applications')
        .select('pemohon, pemohon->ic')
        .or(`pemohon->>okuCard.eq.${formData.pemohonOKUCard},pemohon->>taxAccount.eq.${formData.pemohonTaxAccount},pemohon->>carReg.eq.${formData.pemohonCarReg}`)
        .neq('pemohon->>ic', formData.pemohonIC); // Exclude current user's IC
      
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
          if (pemohon.taxAccount === formData.pemohonTaxAccount) {
            duplicateFields.push('No. Akaun Cukai Taksiran');
          }
          if (pemohon.carReg === formData.pemohonCarReg) {
            duplicateFields.push('No. Pendaftaran Kereta');
          }
        }
        
        if (duplicateFields.length > 0) {
          const uniqueFields = [...new Set(duplicateFields)];
          toast.error(`Maklumat berikut telah didaftarkan oleh pengguna lain: ${uniqueFields.join(', ')}`);
          setIsSubmitting(false);
          return;
        }
      }
      
      // 1. Generate reference number for renewal
      const refNo = await generateRefNumber('pembaharuan');
      toast.info('Generating reference number...');
      
      // 2. Upload documents to Supabase Storage (only if new documents uploaded)
      toast.info('Processing documents...');
      const uploadedDocs: any = {
        icCopy: newDocuments.icCopy ? await uploadFile(newDocuments.icCopy, `${refNo}/ic-copy`) : existingDocuments.icCopy,
        okuCard: newDocuments.okuCard ? await uploadFile(newDocuments.okuCard, `${refNo}/oku-card`) : existingDocuments.okuCard,
        drivingLicense: newDocuments.drivingLicense ? await uploadFile(newDocuments.drivingLicense, `${refNo}/license`) : existingDocuments.drivingLicense,
        passportPhoto: newDocuments.passportPhoto ? await uploadFile(newDocuments.passportPhoto, `${refNo}/photo`) : existingDocuments.passportPhoto,
      };
      
      // 3. Prepare application data
      const applicationData = {
        ref_no: refNo,
        application_type: 'pembaharuan' as const,
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
      
      toast.success('Pembaharuan berjaya dihantar!');
      
      // 6. Redirect to success page
      router.push(`/permohonan/berjaya?ref=${formData.pemohonIC}&type=renewal`);
    } catch (error: any) {
      console.error('Error submitting renewal:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Ralat semasa menghantar pembaharuan';
      if (error.message) {
        if (error.message.includes('Storage')) {
          errorMessage = 'Ralat semasa memuat naik dokumen. Sila cuba lagi.';
        } else if (error.message.includes('duplicate') || error.message.includes('already exists')) {
          errorMessage = 'Pembaharuan dengan maklumat yang sama sudah wujud.';
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

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen py-12 bg-gradient-to-br from-primary/5 to-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Memuat data anda...</p>
              </div>
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
      <main className="min-h-screen py-12 bg-gradient-to-br from-primary/5 to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Borang Permohonan Pelekat Kenderaan OKU</h1>
            <p className="text-muted-foreground">Majlis Perbandaran Hulu Selangor</p>
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <Info className="w-4 h-4 inline mr-2" />
                Maklumat anda telah diisi secara automatik. Sila semak dan kemaskini jika perlu.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Jenis Permohonan - Auto Selected */}
            <Card>
              <CardHeader>
                <CardTitle>Jenis Permohonan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6">
                  <label className="flex items-center opacity-50">
                    <input 
                      type="radio" 
                      name="applicationType" 
                      value="baru"
                      checked={formData.applicationType === 'baru'}
                      disabled
                      className="mr-2"
                    />
                    <span>☐ Baru</span>
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="radio" 
                      name="applicationType" 
                      value="pembaharuan"
                      checked={formData.applicationType === 'pembaharuan'}
                      disabled
                      className="mr-2"
                    />
                    <span className="font-medium">☑ Pembaharuan</span>
                  </label>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  <Info className="w-4 h-4 inline mr-1" />
                  Jenis permohonan telah dipilih berdasarkan semakan IC anda
                </p>
              </CardContent>
            </Card>

            {/* a) Maklumat Pemohon - WAJIB */}
            <Card className="border-l-4 border-l-red-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>a) Maklumat Pemohon</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-red-600 font-medium">WAJIB DIISI</span>
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleEditMode('pemohon')}
                  >
                    {editMode.pemohon ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Sahkan
                      </>
                    ) : (
                      <>
                        <Edit className="w-4 h-4 mr-2" />
                        Kemaskini
                      </>
                    )}
                  </Button>
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
                      disabled={!editMode.pemohon}
                      className={!editMode.pemohon ? 'bg-muted' : ''}
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
                      disabled={!editMode.pemohon}
                      className={!editMode.pemohon ? 'bg-muted' : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pemohonTaxAccount">No Akaun Cukai Taksiran *</Label>
                    <Input
                      id="pemohonTaxAccount"
                      name="pemohonTaxAccount"
                      value={formData.pemohonTaxAccount}
                      onChange={handleInputChange}
                      placeholder="Contoh: T00947903"
                      required
                      disabled={!editMode.pemohon}
                      className={!editMode.pemohon ? 'bg-muted' : ''}
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
                      disabled={!editMode.pemohon}
                      className={!editMode.pemohon ? 'bg-muted' : ''}
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
                      disabled={!editMode.pemohon}
                      className={!editMode.pemohon ? 'bg-muted' : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pemohonOKUCategory">Kategori OKU *</Label>
                    <Select 
                      value={formData.pemohonOKUCategory} 
                      onValueChange={(value) => setFormData({...formData, pemohonOKUCategory: value})}
                      disabled={!editMode.pemohon}
                    >
                      <SelectTrigger className={!editMode.pemohon ? 'bg-muted' : ''}>
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
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="pemohonStreet">Alamat *</Label>
                    <Input
                      id="pemohonStreet"
                      name="pemohonStreet"
                      value={formData.pemohonStreet}
                      onChange={(e) => {
                        handleInputChange(e);
                        // Geocode address and auto-pin on map
                        if (editMode.pemohon) {
                          const address = e.target.value;
                          if (address.length > 5) {
                            console.log('Geocoding address:', address);
                            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', Hulu Selangor, Selangor, Malaysia')}`)
                              .then(res => res.json())
                              .then(data => {
                                console.log('Geocoding result:', data);
                                if (data && data.length > 0) {
                                  const lat = parseFloat(data[0].lat);
                                  const lon = parseFloat(data[0].lon);
                                  console.log('Setting coordinates:', lat, lon);
                                  setLatitude(lat);
                                  setLongitude(lon);
                                }
                              })
                              .catch(err => console.error('Geocoding error:', err));
                          }
                        }
                      }}
                      placeholder="No 123, Jalan Merdeka, Taman Sejahtera"
                      required
                      disabled={!editMode.pemohon}
                      className={!editMode.pemohon ? 'bg-muted' : ''}
                    />
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">Lokasi Pada Peta *</Label>
                  <MapPicker
                    lat={latitude ?? undefined}
                    lon={longitude ?? undefined}
                    invalid={!isInsideDistrict}
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
              </CardContent>
            </Card>

            {/* b) Maklumat Tanggungan - OPTIONAL */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>b) Maklumat Tanggungan</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <Info className="w-4 h-4 text-blue-500" />
                      <span className="text-blue-600 font-medium">PILIHAN (Jika Tanggungan Pemohon Adalah OKU)</span>
                    </CardDescription>
                  </div>
                  {formData.isTanggungan && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggleEditMode('tanggungan')}
                    >
                      {editMode.tanggungan ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Sahkan
                        </>
                      ) : (
                        <>
                          <Edit className="w-4 h-4 mr-2" />
                          Kemaskini
                        </>
                      )}
                    </Button>
                  )}
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
                        disabled={!editMode.tanggungan}
                        className={!editMode.tanggungan ? 'bg-muted' : ''}
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
                        disabled={!editMode.tanggungan}
                        className={!editMode.tanggungan ? 'bg-muted' : ''}
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
                        disabled={!editMode.tanggungan}
                        className={!editMode.tanggungan ? 'bg-muted' : ''}
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
                        disabled={!editMode.tanggungan}
                        className={!editMode.tanggungan ? 'bg-muted' : ''}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dokumen Diperlukan */}
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Dokumen Diperlukan</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <Info className="w-4 h-4 text-orange-500" />
                      <span className="text-orange-600 font-medium">Dokumen sedia ada dipaparkan. Muat naik baharu jika ada perubahan.</span>
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleEditMode('documents')}
                  >
                    {editMode.documents ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Sahkan
                      </>
                    ) : (
                      <>
                        <Edit className="w-4 h-4 mr-2" />
                        Kemaskini
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Use DocumentPreview component with editMode */}
                <DocumentPreview
                  label="Salinan Kad Pengenalan atau Sijil Kelahiran"
                  existingUrl={existingDocuments.icCopy}
                  onUploadNew={(file) => setNewDocuments({...newDocuments, icCopy: file})}
                  newFile={newDocuments.icCopy}
                  required={true}
                  accept="image/*,.pdf"
                  editMode={editMode.documents}
                />

                <DocumentPreview
                  label="Salinan Kad OKU"
                  existingUrl={existingDocuments.okuCard}
                  onUploadNew={(file) => setNewDocuments({...newDocuments, okuCard: file})}
                  newFile={newDocuments.okuCard}
                  required={true}
                  accept="image/*,.pdf"
                  editMode={editMode.documents}
                />

                <DocumentPreview
                  label="Salinan Lesen Memandu"
                  existingUrl={existingDocuments.drivingLicense}
                  onUploadNew={(file) => setNewDocuments({...newDocuments, drivingLicense: file})}
                  newFile={newDocuments.drivingLicense}
                  required={true}
                  accept="image/*,.pdf"
                  editMode={editMode.documents}
                />

                <DocumentPreview
                  label="Gambar Passport Size"
                  existingUrl={existingDocuments.passportPhoto}
                  onUploadNew={(file) => setNewDocuments({...newDocuments, passportPhoto: file})}
                  newFile={newDocuments.passportPhoto}
                  required={true}
                  accept="image/*"
                  editMode={editMode.documents}
                />

                {/* Note about old sticker - NO UPLOAD */}
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-red-900 mb-1">
                        ⚠️ Pelekat OKU Yang Lama (Wajib)
                      </h4>
                      <p className="text-sm text-red-800">
                        Sila bawa <strong>pelekat OKU lama</strong> anda bersama ke Pejabat MPHS semasa mengambil pelekat baharu.
                      </p>
                    </div>
                  </div>
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
                disabled={isSubmitting || !isInsideDistrict || !confirmDeclaration}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menghantar Pembaharuan...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Hantar Pembaharuan
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
