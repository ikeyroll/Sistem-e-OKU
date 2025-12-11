"use client";

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Download, Eye, CheckCircle, XCircle, Calendar, Package } from 'lucide-react';
import { toast } from 'sonner';
import { generateNoSiri } from '@/lib/generateNoSiri';
import { exportWithDateRange } from '@/lib/csvExport';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  getApplications, 
  searchApplications, 
  filterApplicationsByStatus,
  approveApplication,
  rejectApplication,
  markAsReady,
  markAsCollected,
  getApplicationsForExport
} from '@/lib/api/applications';
import { useEffect } from 'react';

interface Application {
  id: string;
  ref_no: string;
  no_siri?: string;
  application_type: 'baru' | 'pembaharuan';
  pemohon: {
    name: string;
    ic: string;
    okuCard: string;
    phone: string;
    carReg: string;
    okuCategory: string;
    address: string;
  };
  tanggungan?: {
    name: string;
    relation: string;
    ic: string;
    company?: string;
  };
  documents: {
    icCopy: string;
    okuCard: string;
    drivingLicense: string;
    passportPhoto: string;
    tanggunganSignature?: string;
  };
  status: 'Dalam Proses' | 'Diluluskan' | 'Sedia Diambil' | 'Telah Diambil' | 'Tidak Lengkap';
  submitted_date: string;
  approved_date?: string;
  ready_date?: string;
  collected_date?: string;
  admin_notes?: string;
}

// Remove mock data - will load from Supabase
const mockApplications: Application[] = [
  // Removed - using Supabase now
];
  {
    id: '1',
    refNo: 'REF12345678',
    applicationType: 'baru',
    pemohon: {
      name: 'Ahmad bin Ali',
      ic: '850215-10-5432',
      okuCard: 'OKU123456',
      phone: '0123456789',
      carReg: 'WXY1234',
      okuCategory: 'Penglihatan',
      address: 'No 123, Jalan Merdeka, 44000 KKB',
    },
    documents: {
      icCopy: '/uploads/ic-ahmad.pdf',
      okuCard: '/uploads/oku-ahmad.jpg',
      drivingLicense: '/uploads/license-ahmad.pdf',
      passportPhoto: '/uploads/photo-ahmad.jpg',
    },
    status: 'Dalam Proses',
    submittedDate: new Date('2025-01-15'),
  },
  {
    id: '2',
    refNo: 'REN87654321',
    noSiri: 'MPHS/2025/001',
    applicationType: 'pembaharuan',
    pemohon: {
      name: 'Siti Nurhaliza',
      ic: '920308-14-6789',
      okuCard: 'OKU789012',
      phone: '0198765432',
      carReg: 'DEF5678',
      okuCategory: 'Pendengaran',
      address: 'No 45, Jalan Harmoni, 44100 Batang Kali',
    },
    tanggungan: {
      name: 'Abdullah bin Hassan',
      relation: 'Bapa',
      ic: '650505-10-1111',
      company: 'Persatuan OKU Selangor',
    },
    documents: {
      icCopy: '/uploads/ic-siti.pdf',
      okuCard: '/uploads/oku-siti.jpg',
      drivingLicense: '/uploads/license-siti.pdf',
      passportPhoto: '/uploads/photo-siti.jpg',
      tanggunganSignature: '/uploads/signature-abdullah.jpg',
    },
    status: 'Diluluskan',
    submittedDate: new Date('2025-01-10'),
    approvedDate: new Date('2025-01-12'),
  },
  {
    id: '3',
    refNo: 'REF11223344',
    applicationType: 'baru',
    pemohon: {
      name: 'Kumar a/l Raj',
      ic: '880101-05-1234',
      okuCard: 'OKU345678',
      phone: '0167891234',
      carReg: 'GHI9012',
      okuCategory: 'Fizikal',
      address: 'No 78, Taman Damai, 44000 KKB',
    },
    documents: {
      icCopy: '/uploads/ic-kumar.pdf',
      okuCard: '/uploads/oku-kumar-blur.jpg',
      drivingLicense: '/uploads/license-kumar.pdf',
      passportPhoto: '/uploads/photo-kumar.jpg',
    },
    status: 'Tidak Lengkap',
    submittedDate: new Date('2025-01-08'),
    adminNotes: 'Dokumen tidak lengkap. Salinan kad OKU tidak jelas dan perlu dikemukakan semula. Sila pastikan semua dokumen dalam keadaan baik dan boleh dibaca dengan jelas.',
  },
];

export default function AdminPanel() {
  const { language } = useLanguage();
  const [applications, setApplications] = useState<Application[]>(mockApplications);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReadyModal, setShowReadyModal] = useState(false);
  const [showCollectedModal, setShowCollectedModal] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Filter applications
  const filteredApps = applications.filter(app => {
    const matchesSearch = 
      app.refNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.noSiri?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.pemohon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.pemohon.ic.includes(searchQuery);
    
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleApprove = async () => {
    if (!selectedApp) return;

    try {
      // Generate No Siri
      const year = new Date().getFullYear();
      const noSiri = await generateNoSiri(year);

      // Update application
      setApplications(prev => prev.map(app => 
        app.id === selectedApp.id
          ? { ...app, status: 'Diluluskan' as const, noSiri, approvedDate: new Date() }
          : app
      ));

      toast.success(`Permohonan diluluskan! No Siri: ${noSiri}`);
      setShowApproveModal(false);
      setSelectedApp(null);
    } catch (error) {
      toast.error('Ralat semasa meluluskan permohonan');
    }
  };

  const handleReject = () => {
    if (!selectedApp || !rejectionNotes.trim()) {
      toast.error('Sila masukkan sebab penolakan');
      return;
    }

    // Count words
    const wordCount = rejectionNotes.trim().split(/\s+/).length;
    if (wordCount > 80) {
      toast.error('Catatan melebihi 80 perkataan');
      return;
    }

    // Update application
    setApplications(prev => prev.map(app => 
      app.id === selectedApp.id
        ? { ...app, status: 'Tidak Lengkap' as const, adminNotes: rejectionNotes }
        : app
    ));

    toast.success('Permohonan ditandakan sebagai tidak lengkap');
    setShowRejectModal(false);
    setSelectedApp(null);
    setRejectionNotes('');
  };

  const handleReady = () => {
    if (!selectedApp) return;

    setApplications(prev => prev.map(app => 
      app.id === selectedApp.id
        ? { ...app, status: 'Sedia Diambil' as const, readyDate: new Date() }
        : app
    ));

    toast.success('Pelekat sedia untuk diambil');
    setShowReadyModal(false);
    setSelectedApp(null);
  };

  const handleCollected = () => {
    if (!selectedApp) return;

    setApplications(prev => prev.map(app => 
      app.id === selectedApp.id
        ? { ...app, status: 'Telah Diambil' as const, collectedDate: new Date() }
        : app
    ));

    toast.success('Pelekat telah diambil');
    setShowCollectedModal(false);
    setSelectedApp(null);
  };

  const handleExportCSV = () => {
    if (!dateFrom || !dateTo) {
      toast.error('Sila pilih tarikh mula dan tarikh akhir');
      return;
    }

    exportWithDateRange(applications, new Date(dateFrom), new Date(dateTo));
    toast.success('CSV berjaya dimuat turun');
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
      case 'Tidak Lengkap':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Tidak Lengkap</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    return type === 'baru' 
      ? <Badge variant="outline" className="bg-blue-50 text-blue-700">Baharu</Badge>
      : <Badge variant="outline" className="bg-purple-50 text-purple-700">Pembaharuan</Badge>;
  };

  const wordCount = rejectionNotes.trim().split(/\s+/).filter(w => w).length;

  return (
    <>
      <Header />
      <main className="min-h-screen py-12 bg-gradient-to-br from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Admin</h1>
            <p className="text-muted-foreground">Pengurusan Permohonan Pelekat OKU</p>
          </div>

          {/* Search & Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Carian & Penapis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label>Cari (No Rujukan, No Siri, IC, Nama)</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cth: REF12345678, MPHS/2025/001, 850215-10-5432"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="Dalam Proses">Dalam Proses</SelectItem>
                      <SelectItem value="Diluluskan">Diluluskan</SelectItem>
                      <SelectItem value="Sedia Diambil">Sedia Diambil</SelectItem>
                      <SelectItem value="Telah Diambil">Telah Diambil</SelectItem>
                      <SelectItem value="Tidak Lengkap">Tidak Lengkap</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export CSV */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Eksport Data (CSV)</CardTitle>
              <CardDescription>Pilih julat tarikh untuk eksport</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Tarikh Mula</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Tarikh Akhir</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleExportCSV} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Muat Turun CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Applications Table */}
          <Card>
            <CardHeader>
              <CardTitle>Senarai Permohonan ({filteredApps.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Rujukan</TableHead>
                      <TableHead>No. Siri</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>No. IC</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tarikh Mohon</TableHead>
                      <TableHead className="text-right">Tindakan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApps.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Tiada permohonan dijumpai
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredApps.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">{app.refNo}</TableCell>
                          <TableCell>
                            {app.noSiri ? (
                              <span className="font-mono text-sm bg-green-50 text-green-700 px-2 py-1 rounded">
                                {app.noSiri}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{getTypeBadge(app.applicationType)}</TableCell>
                          <TableCell>{app.pemohon.name}</TableCell>
                          <TableCell className="font-mono text-sm">{app.pemohon.ic}</TableCell>
                          <TableCell>{getStatusBadge(app.status)}</TableCell>
                          <TableCell>{new Date(app.submittedDate).toLocaleDateString('ms-MY')}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {/* View Button - Always Available */}
                              <Button
                                size="sm"
                                variant="outline"
                                title="Lihat Butiran"
                                onClick={() => {
                                  setSelectedApp(app);
                                  setShowDetailModal(true);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>

                              {/* Pending Status - Show Approve/Reject */}
                              {app.status === 'Dalam Proses' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 hover:bg-green-50"
                                    title="Luluskan"
                                    onClick={() => {
                                      setSelectedApp(app);
                                      setShowApproveModal(true);
                                    }}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 hover:bg-red-50"
                                    title="Tidak Lengkap"
                                    onClick={() => {
                                      setSelectedApp(app);
                                      setShowRejectModal(true);
                                    }}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </>
                              )}

                              {/* Approved Status - Show Ready Button */}
                              {app.status === 'Diluluskan' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-blue-600 hover:bg-blue-50"
                                  title="Sedia Diambil"
                                  onClick={() => {
                                    setSelectedApp(app);
                                    setShowReadyModal(true);
                                  }}
                                >
                                  <Package className="w-4 h-4" />
                                </Button>
                              )}

                              {/* Ready Status - Show Collected Button */}
                              {app.status === 'Sedia Diambil' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-purple-600 hover:bg-purple-50"
                                  title="Telah Diambil"
                                  onClick={() => {
                                    setSelectedApp(app);
                                    setShowCollectedModal(true);
                                  }}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Detail Modal - Enhanced with Documents */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Butiran Permohonan Lengkap</DialogTitle>
            <DialogDescription className="flex items-center gap-4">
              <span>No. Rujukan: <span className="font-mono font-semibold">{selectedApp?.refNo}</span></span>
              {selectedApp && getStatusBadge(selectedApp.status)}
            </DialogDescription>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-6">
              {/* No Siri */}
              {selectedApp.noSiri && (
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800 mb-1">No. Siri Pelekat</p>
                  <p className="text-2xl font-bold text-green-900 font-mono">{selectedApp.noSiri}</p>
                </div>
              )}
              
              {/* Maklumat Pemohon */}
              <Card>
                <CardHeader className="bg-blue-50">
                  <CardTitle className="text-lg">a) Maklumat Pemohon OKU</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Nama Pemohon</p>
                      <p className="font-semibold">{selectedApp.pemohon.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">No. Kad Pengenalan</p>
                      <p className="font-mono font-semibold">{selectedApp.pemohon.ic}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">No. Kad OKU</p>
                      <p className="font-semibold">{selectedApp.pemohon.okuCard}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">No. Telefon</p>
                      <p className="font-semibold">{selectedApp.pemohon.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">No. Pendaftaran Kereta</p>
                      <p className="font-semibold">{selectedApp.pemohon.carReg}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Kategori OKU</p>
                      <p className="font-semibold">{selectedApp.pemohon.okuCategory}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">Alamat</p>
                      <p className="font-semibold">{selectedApp.pemohon.address}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Maklumat Tanggungan */}
              {selectedApp.tanggungan && (
                <Card>
                  <CardHeader className="bg-purple-50">
                    <CardTitle className="text-lg">b) Maklumat Tanggungan</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Nama Penjaga/Wali</p>
                        <p className="font-semibold">{selectedApp.tanggungan.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Hubungan</p>
                        <p className="font-semibold">{selectedApp.tanggungan.relation}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">No. Kad Pengenalan Penjaga</p>
                        <p className="font-mono font-semibold">{selectedApp.tanggungan.ic}</p>
                      </div>
                      {selectedApp.tanggungan.company && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Nama Persatuan</p>
                          <p className="font-semibold">{selectedApp.tanggungan.company}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Documents */}
              <Card>
                <CardHeader className="bg-amber-50">
                  <CardTitle className="text-lg">Dokumen Yang Dimuat Naik</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* IC Copy */}
                    <div className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                      <p className="text-sm font-medium mb-2">Salinan Kad Pengenalan</p>
                      <a 
                        href={selectedApp.documents.icCopy} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Lihat Dokumen
                      </a>
                    </div>

                    {/* OKU Card */}
                    <div className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                      <p className="text-sm font-medium mb-2">Salinan Kad OKU</p>
                      <a 
                        href={selectedApp.documents.okuCard} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Lihat Dokumen
                      </a>
                    </div>

                    {/* Driving License */}
                    <div className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                      <p className="text-sm font-medium mb-2">Salinan Lesen Memandu</p>
                      <a 
                        href={selectedApp.documents.drivingLicense} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Lihat Dokumen
                      </a>
                    </div>

                    {/* Passport Photo */}
                    <div className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                      <p className="text-sm font-medium mb-2">Gambar Pasport</p>
                      <a 
                        href={selectedApp.documents.passportPhoto} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Lihat Gambar
                      </a>
                    </div>

                    {/* Tanggungan Signature */}
                    {selectedApp.documents.tanggunganSignature && (
                      <div className="border rounded-lg p-3 hover:bg-muted/50 transition-colors col-span-2">
                        <p className="text-sm font-medium mb-2">Tandatangan Penjaga</p>
                        <a 
                          href={selectedApp.documents.tanggunganSignature} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Lihat Tandatangan
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Admin Notes */}
              {selectedApp.adminNotes && (
                <div className="p-4 bg-red-50 border-l-4 border-l-red-500 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                    <XCircle className="w-5 h-5" />
                    Catatan Admin
                  </h4>
                  <p className="text-sm text-red-700">{selectedApp.adminNotes}</p>
                </div>
              )}

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Timeline Permohonan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                      <div>
                        <p className="font-medium">Permohonan Diterima</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(selectedApp.submittedDate).toLocaleDateString('ms-MY', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                    {selectedApp.approvedDate && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                        <div>
                          <p className="font-medium">Diluluskan</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(selectedApp.approvedDate).toLocaleDateString('ms-MY', { 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Modal */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Luluskan Permohonan</DialogTitle>
            <DialogDescription>
              Adakah anda pasti untuk meluluskan permohonan ini?
            </DialogDescription>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-700">No. Rujukan: <span className="font-semibold">{selectedApp.refNo}</span></p>
                <p className="text-sm text-blue-700">Nama: <span className="font-semibold">{selectedApp.pemohon.name}</span></p>
                <p className="text-sm text-blue-700 mt-2">No. Siri akan dijana secara automatik</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveModal(false)}>Batal</Button>
            <Button onClick={handleApprove}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Sahkan Kelulusan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permohonan Tidak Lengkap</DialogTitle>
            <DialogDescription>
              Sila nyatakan sebab permohonan tidak lengkap
            </DialogDescription>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-700">No. Rujukan: <span className="font-semibold">{selectedApp.refNo}</span></p>
                <p className="text-sm text-red-700">Nama: <span className="font-semibold">{selectedApp.pemohon.name}</span></p>
              </div>
              
              <div>
                <Label htmlFor="notes">Sebab/Catatan (Maksimum 80 perkataan) *</Label>
                <Textarea
                  id="notes"
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="Nyatakan sebab permohonan tidak lengkap. Contoh: Dokumen tidak lengkap, maklumat tidak tepat, dll."
                  rows={4}
                  className="mt-2"
                />
                <p className={`text-sm mt-1 ${wordCount > 80 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {wordCount}/80 perkataan
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRejectModal(false);
              setRejectionNotes('');
            }}>Batal</Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionNotes.trim() || wordCount > 80}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Sahkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ready Modal */}
      <Dialog open={showReadyModal} onOpenChange={setShowReadyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pelekat Sedia Diambil</DialogTitle>
            <DialogDescription>
              Tandakan pelekat sedia untuk diambil oleh pemohon
            </DialogDescription>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-700">No. Rujukan: <span className="font-semibold">{selectedApp.refNo}</span></p>
                <p className="text-sm text-blue-700">Nama: <span className="font-semibold">{selectedApp.pemohon.name}</span></p>
                {selectedApp.noSiri && (
                  <p className="text-sm text-blue-700 mt-2">No. Siri: <span className="font-mono font-semibold">{selectedApp.noSiri}</span></p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReadyModal(false)}>Batal</Button>
            <Button onClick={handleReady} className="bg-blue-600 hover:bg-blue-700">
              <Package className="w-4 h-4 mr-2" />
              Sahkan Sedia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Collected Modal */}
      <Dialog open={showCollectedModal} onOpenChange={setShowCollectedModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pelekat Telah Diambil</DialogTitle>
            <DialogDescription>
              Sahkan pelekat telah diambil oleh pemohon
            </DialogDescription>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded">
                <p className="text-sm text-purple-700">No. Rujukan: <span className="font-semibold">{selectedApp.refNo}</span></p>
                <p className="text-sm text-purple-700">Nama: <span className="font-semibold">{selectedApp.pemohon.name}</span></p>
                {selectedApp.noSiri && (
                  <p className="text-sm text-purple-700 mt-2">No. Siri: <span className="font-mono font-semibold">{selectedApp.noSiri}</span></p>
                )}
              </div>
              <div className="p-3 bg-yellow-50 border-l-4 border-l-yellow-500 rounded">
                <p className="text-sm text-yellow-800">
                  ⚠️ Pastikan pemohon telah mengembalikan pelekat lama (jika pembaharuan)
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCollectedModal(false)}>Batal</Button>
            <Button onClick={handleCollected} className="bg-purple-600 hover:bg-purple-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Sahkan Diambil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </>
  );
}
