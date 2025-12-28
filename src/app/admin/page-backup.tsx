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
import { Search, Download, Eye, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { generateNoSiri } from '@/lib/generateNoSiri';
import { exportWithDateRange } from '@/lib/csvExport';
import { useLanguage } from '@/contexts/LanguageContext';

interface Application {
  id: string;
  refNo: string;
  noSiri?: string;
  applicationType: 'baru' | 'pembaharuan';
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
  };
  status: 'Pending' | 'Approved' | 'Tidak Lengkap';
  submittedDate: Date;
  approvedDate?: Date;
  adminNotes?: string;
}

// Mock data with new structure
const mockApplications: Application[] = [
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
    status: 'Pending',
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
    },
    status: 'Approved',
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
          ? { ...app, status: 'Approved' as const, noSiri, approvedDate: new Date() }
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
      case 'Pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Dalam Proses</Badge>;
      case 'Approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Diluluskan</Badge>;
      case 'Tidak Lengkap':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Tidak Berjaya</Badge>;
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
                      placeholder="Cth: OKU0000001, MPHS/2025/001, 850215-10-5432"
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
                      <SelectItem value="all">Semua</SelectItem>
                      <SelectItem value="Pending">Dalam Proses</SelectItem>
                      <SelectItem value="Approved">Diluluskan</SelectItem>
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
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedApp(app);
                                  setShowDetailModal(true);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {app.status === 'Pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 hover:text-green-700"
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
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => {
                                      setSelectedApp(app);
                                      setShowRejectModal(true);
                                    }}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </>
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

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Butiran Permohonan</DialogTitle>
            <DialogDescription>No. Rujukan: {selectedApp?.refNo}</DialogDescription>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              {selectedApp.noSiri && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">No. Siri</p>
                  <p className="text-lg font-bold text-green-900 font-mono">{selectedApp.noSiri}</p>
                </div>
              )}
              
              <div>
                <h4 className="font-semibold mb-2">Maklumat Pemohon</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Nama:</span> {selectedApp.pemohon.name}</div>
                  <div><span className="text-muted-foreground">IC:</span> {selectedApp.pemohon.ic}</div>
                  <div><span className="text-muted-foreground">Kad OKU:</span> {selectedApp.pemohon.okuCard}</div>
                  <div><span className="text-muted-foreground">Telefon:</span> {selectedApp.pemohon.phone}</div>
                  <div><span className="text-muted-foreground">No. Kereta:</span> {selectedApp.pemohon.carReg}</div>
                  <div><span className="text-muted-foreground">Kategori:</span> {selectedApp.pemohon.okuCategory}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Alamat:</span> {selectedApp.pemohon.address}</div>
                </div>
              </div>

              {selectedApp.tanggungan && (
                <div>
                  <h4 className="font-semibold mb-2">Maklumat Tanggungan</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Nama Penjaga:</span> {selectedApp.tanggungan.name}</div>
                    <div><span className="text-muted-foreground">Hubungan:</span> {selectedApp.tanggungan.relation}</div>
                    <div><span className="text-muted-foreground">IC Penjaga:</span> {selectedApp.tanggungan.ic}</div>
                  </div>
                </div>
              )}

              {selectedApp.adminNotes && (
                <div className="p-4 bg-red-50 border-l-4 border-l-red-500 rounded">
                  <h4 className="font-semibold text-red-800 mb-2">Catatan Admin</h4>
                  <p className="text-sm text-red-700">{selectedApp.adminNotes}</p>
                </div>
              )}
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

      <Footer />
    </>
  );
}
