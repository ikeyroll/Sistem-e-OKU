"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Search, Download, Eye, CheckCircle, XCircle, Calendar, FileText, Image as ImageIcon, Map, Edit, Save, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateNoSiri } from '@/lib/generateNoSiri';
import { exportBySession } from '@/lib/csvExport';
import { useLanguage } from '@/contexts/LanguageContext';
import { getApplications, approveApplication as approveApp, rejectApplication as rejectApp, markAsReady, markAsCollected, updateApplication, deleteApplication } from '@/lib/api/applications';
import MapPicker from '@/components/MapPicker';
import { getIssuedCount, getSessionCapacity, setSessionCapacity } from '@/lib/api/session';
import type { Application } from '@/lib/supabase';

// No mock data - using Supabase only

export default function AdminPanel() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');
  // Session capacity management state
  const currentYear = new Date().getFullYear();
  const [selectedSessionYear, setSelectedSessionYear] = useState<number>(currentYear);
  const [sessionCapacity, setSessionCapacityState] = useState<number>(350);
  const [issuedCount, setIssuedCountState] = useState<number>(0);
  const [sessionLoading, setSessionLoading] = useState<boolean>(false);
  const [capacityInput, setCapacityInput] = useState<string>('350');
  
  // KML download state
  const [kmlSession, setKmlSession] = useState<string>('all');
  const [kmlMukim, setKmlMukim] = useState<string>('all');
  const [dummyApps, setDummyApps] = useState<any[]>([]);
  
  // Check if user is admin_boss
  const [isAdminBoss, setIsAdminBoss] = useState(false);
  
  useEffect(() => {
    const role = localStorage.getItem('adminRole');
    setIsAdminBoss(role === 'admin_boss');
  }, []);

  // Mukim center coordinates with small radius for realistic distribution - All 13 Mukims
  const MUKIM_COORDS: Record<string, { lat: number; lon: number; radius: number }> = {
    'Ulu Bernam': { lat: 3.6833, lon: 101.5000, radius: 0.03 },
    'Sungai Tinggi': { lat: 3.6500, lon: 101.5500, radius: 0.025 },
    'Sungai Gumut': { lat: 3.6000, lon: 101.5200, radius: 0.025 },
    'Kuala Kalumpang': { lat: 3.5800, lon: 101.4800, radius: 0.02 },
    'Kalumpang': { lat: 3.5500, lon: 101.5000, radius: 0.025 },
    'Kerling': { lat: 3.4833, lon: 101.5833, radius: 0.02 },
    'Buloh Telor': { lat: 3.5200, lon: 101.5800, radius: 0.02 },
    'Ampang Pechah': { lat: 3.4000, lon: 101.5500, radius: 0.025 },
    'Peretak': { lat: 3.4300, lon: 101.5700, radius: 0.02 },
    'Rasa': { lat: 3.5000, lon: 101.5333, radius: 0.02 },
    'Batang Kali': { lat: 3.4500, lon: 101.6333, radius: 0.02 },
    'Ulu Yam': { lat: 3.4167, lon: 101.6833, radius: 0.02 },
    'Serendah': { lat: 3.3667, lon: 101.6000, radius: 0.025 },
  };

  // Generate dummy data for KML (same as dashboard - coordinates match mukim)
  const generateDummyApps = (year: number) => {
    const apps: any[] = [];
    const statuses = ['Dalam Proses', 'Diluluskan', 'Tidak Lengkap', 'Sedia Diambil', 'Telah Diambil'];
    const mukims = Object.keys(MUKIM_COORDS);
    
    // Generate apps per mukim for realistic distribution
    mukims.forEach(mukim => {
      const mukimCoord = MUKIM_COORDS[mukim];
      // 10-25 apps per mukim
      const count = 10 + Math.floor(Math.random() * 15);
      
      for (let i = 0; i < count; i++) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        const month = Math.floor(Math.random() * 12);
        const day = 1 + Math.floor(Math.random() * 28);
        const date = new Date(year, month, day);
        
        // Generate coords within mukim's radius (realistic clustering)
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * mukimCoord.radius;
        const lat = mukimCoord.lat + distance * Math.cos(angle);
        const lon = mukimCoord.lon + distance * Math.sin(angle);

        const isApproved = ['Diluluskan', 'Sedia Diambil', 'Telah Diambil'].includes(status);
        const approvedDate = isApproved ? date : null;
        const expiryDate = isApproved ? new Date(date.getFullYear() + 2, date.getMonth(), date.getDate()) : null;
        
        apps.push({
          id: `dummy-${year}-${mukim}-${i}`,
          ref_no: `REF${year}${mukim.substring(0, 2).toUpperCase()}${String(i).padStart(3, '0')}`,
          no_siri: isApproved ? `MPHS/OKU/${year}/${String(i + 1).padStart(4, '0')}` : null,
          daerah: 'Hulu Selangor',
          mukim: mukim,
          status: status,
          latitude: lat,
          longitude: lon,
          application_type: i % 2 === 0 ? 'baru' : 'pembaharuan',
          pemohon: {
            name: `Pemohon ${mukim} ${i + 1}`,
            ic: `${Math.floor(Math.random() * 900000 + 100000)}-${Math.floor(Math.random() * 90 + 10)}-${Math.floor(Math.random() * 9000 + 1000)}`,
            okuCard: `OKU${Math.floor(Math.random() * 90000 + 10000)}`,
            phone: `01${Math.floor(Math.random() * 10)}-${Math.floor(Math.random() * 9000000 + 1000000)}`,
            carReg: `W${Math.floor(Math.random() * 9000 + 1000)} ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
            okuCategory: ['Penglihatan', 'Pendengaran', 'Fizikal', 'Mental'][Math.floor(Math.random() * 4)],
            taxAccount: `${Math.floor(Math.random() * 900000 + 100000)}`,
            address: `No ${i + 1}, Jalan ${mukim}, ${mukim}, Hulu Selangor`
          },
          submitted_date: date.toISOString(),
          approved_date: approvedDate ? approvedDate.toISOString() : null,
          expiry_date: expiryDate ? expiryDate.toISOString() : null,
          created_at: date.toISOString()
        });
      }
    });
    
    return apps;
  };

  // Load dummy data for all available sessions
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const allApps: any[] = [];
    
    // Generate for last 5 years
    for (let i = 0; i <= 5; i++) {
      const year = currentYear - i;
      allApps.push(...generateDummyApps(year));
    }
    
    setDummyApps(allApps);
  }, []);

  // Check authentication
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('adminLoggedIn');
    if (!isLoggedIn) {
      router.push('/admin/login');
    } else {
      // Load data from Supabase
      loadApplications();
    }
  }, [router]);

  // Load applications from Supabase
  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await getApplications();
      setApplications(data);
      toast.success(`Loaded ${data.length} applications from database`);
    } catch (error) {
      console.error('Error loading applications:', error);
      toast.error('Error loading data from Supabase');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminUser');
    document.cookie = 'adminLoggedIn=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    router.push('/admin/login');
  };

  // Get unique mukims from dummy data
  const getUniqueMukims = () => {
    const mukims = new Set<string>();
    dummyApps.forEach(app => {
      if (app.mukim) {
        mukims.add(app.mukim);
      }
    });
    return Array.from(mukims).sort();
  };

  // Get unique sessions from dummy data
  const getKMLSessions = () => {
    const sessions = new Set<string>();
    dummyApps.forEach(app => {
      if (app.approved_date) {
        const year = new Date(app.approved_date).getFullYear();
        sessions.add(`${year}/${year + 2}`);
      }
    });
    return Array.from(sessions).sort().reverse();
  };

  // Helper to check if status is successful (same as dashboard)
  const isSuccessStatus = (status: string) => ['Diluluskan', 'Sedia Diambil', 'Telah Diambil'].includes(status);

  // Handle KML download using dummy data - ONLY successful applications (same as dashboard map)
  const handleKMLDownload = async () => {
    try {
      const { generateKML } = await import('@/lib/kml');
      
      // Filter dummy applications - ONLY SUCCESSFUL (Berjaya) apps with coordinates
      let filteredApps = dummyApps.filter(app => {
        // Only include apps with coordinates
        if (!app.latitude || !app.longitude) return false;
        
        // IMPORTANT: Only include successful applications (same as dashboard map)
        if (!isSuccessStatus(app.status)) return false;
        
        // Filter by session
        if (kmlSession !== 'all') {
          if (app.approved_date) {
            const year = new Date(app.approved_date).getFullYear();
            const appSession = `${year}/${year + 2}`;
            if (appSession !== kmlSession) return false;
          } else {
            return false;
          }
        }
        
        // Filter by mukim
        if (kmlMukim !== 'all') {
          if (app.mukim !== kmlMukim) return false;
        }
        
        return true;
      });

      if (filteredApps.length === 0) {
        toast.error('Tiada data untuk dimuat turun');
        return;
      }

      const kmlContent = generateKML(filteredApps);
      const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Generate filename
      let filename = 'peta-interaktif';
      if (kmlSession !== 'all') filename += `-${kmlSession.replace('/', '-')}`;
      if (kmlMukim !== 'all') filename += `-${kmlMukim}`;
      filename += '.kml';
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`KML dimuat turun: ${filteredApps.length} lokasi`);
    } catch (error) {
      console.error('Error generating KML:', error);
      toast.error('Gagal menjana fail KML');
    }
  };
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [csvSessionFilter, setCsvSessionFilter] = useState('all');
  
  // Edit mode state
  const [editFormData, setEditFormData] = useState({
    name: '',
    ic: '',
    okuCard: '',
    taxAccount: '',
    phone: '',
    carReg: '',
    okuCategory: '',
    street: '',
    mukim: '',
    poskod: '',
    daerah: 'Hulu Selangor',
    negeri: 'Selangor',
  });
  const [editLatitude, setEditLatitude] = useState<number | null>(null);
  const [editLongitude, setEditLongitude] = useState<number | null>(null);
  const [editDaerah, setEditDaerah] = useState<string>('');
  const [editMukim, setEditMukim] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle delete application
  const handleDeleteApplication = async () => {
    if (!selectedApp) return;
    
    setIsDeleting(true);
    try {
      await deleteApplication(selectedApp.id);
      
      // Update local state
      setApplications(prev => prev.filter(app => app.id !== selectedApp.id));
      
      toast.success(language === 'en' ? 'Application deleted successfully' : 'Permohonan berjaya dipadam');
      setShowDeleteModal(false);
      setShowDetailModal(false);
      setSelectedApp(null);
    } catch (error: any) {
      console.error('Error deleting application:', error);
      toast.error(error.message || (language === 'en' ? 'Error deleting application' : 'Ralat semasa memadam permohonan'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper function to get session in format YYYY/YYYY+2
  const getSession = (approvedDate: string | null): string => {
    if (!approvedDate) return '-';
    try {
      const year = new Date(approvedDate).getFullYear();
      return `${year}/${year + 2}`;
    } catch (e) {
      return '-';
    }
  };

  // Get unique sessions from applications
  const getUniqueSessions = () => {
    const sessions = new Set<string>();
    applications.forEach(app => {
      if (app.approved_date) {
        const session = getSession(app.approved_date);
        if (session) {
          sessions.add(session);
        }
      }
    });
    return Array.from(sessions).sort().reverse(); // Sort by most recent first
  };

  const getSessionString = (year: number) => `${year}/${year + 2}`;

  // Load session capacity/issued when selected year changes
  useEffect(() => {
    let yearToUse = selectedSessionYear;
    // If sessions exist, map "YYYY/YYYY+2" to first year
    const sessions = getUniqueSessions();
    if (sessions.length > 0) {
      const firstYear = parseInt(sessions[0].split('/')[0]);
      if (!isNaN(firstYear)) {
        yearToUse = selectedSessionYear || firstYear;
      }
    }
    setSessionLoading(true);
    Promise.all([getSessionCapacity(yearToUse), getIssuedCount(yearToUse)])
      .then(([cap, issued]) => {
        setSessionCapacityState(cap);
        setIssuedCountState(issued);
        setCapacityInput(String(cap));
      })
      .finally(() => setSessionLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionYear, applications.length]);

  // Filter applications
  const filteredApps = applications.filter((app) => {
    const matchesSearch =
      app.ref_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.no_siri?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      app.pemohon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.pemohon.ic.includes(searchQuery);
    
    // Handle both old and new status values
    const normalizedStatus = app.status === 'Tidak Berjaya' ? 'Tidak Lengkap' : app.status;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'Tidak Lengkap' && (normalizedStatus === 'Tidak Lengkap' || app.status === 'Tidak Berjaya')) ||
                         normalizedStatus === statusFilter;
    
    const appSession = getSession(app.approved_date || null);
    const matchesSession = sessionFilter === 'all' || appSession === sessionFilter;
    
    return matchesSearch && matchesStatus && matchesSession;
  });

  const handleApprove = async () => {
    if (!selectedApp) return;

    try {
      // Call Supabase API to approve
      const updated = await approveApp(selectedApp.id);
      
      // Update local state
      setApplications(prev => prev.map(app => 
        app.id === selectedApp.id ? updated : app
      ));

      toast.success(`Permohonan diluluskan! No Siri: ${updated.no_siri}`);
      setShowApproveModal(false);
      setSelectedApp(null);
    } catch (error: any) {
      console.error('Error approving:', error);
      toast.error(error.message || 'Ralat semasa meluluskan permohonan');
    }
  };

  const handleReject = async () => {
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

    try {
      // Call Supabase API to reject
      const updated = await rejectApp(selectedApp.id, rejectionNotes);
      
      // Update local state
      setApplications(prev => prev.map(app => 
        app.id === selectedApp.id ? updated : app
      ));

      toast.success('Permohonan ditandakan sebagai tidak lengkap');
      setShowRejectModal(false);
      setSelectedApp(null);
      setRejectionNotes('');
    } catch (error: any) {
      console.error('Error rejecting:', error);
      toast.error(error.message || 'Ralat semasa menolak permohonan');
    }
  };

  const handleExportCSV = () => {
    // Use real applications if available, otherwise use dummy data
    let appsToExport: Application[] = applications.length > 0 ? applications : dummyApps as Application[];
    
    if (appsToExport.length === 0) {
      toast.error('Tiada data untuk dimuat turun');
      return;
    }

    exportBySession(appsToExport, csvSessionFilter);
    toast.success(`CSV berjaya dimuat turun${csvSessionFilter !== 'all' ? ` (Sesi ${csvSessionFilter})` : ''}`);
  };

  const handleMarkReady = async (id: string) => {
    try {
      // Call API to mark as ready
      const updated = await markAsReady(id);
      
      // Update local state
      setApplications(prev => prev.map(app => 
        app.id === id ? updated : app
      ));
      
      toast.success('Status dikemaskini: Sedia Diambil');
    } catch (error: any) {
      console.error('Error marking ready:', error);
      toast.error(error.message || 'Ralat semasa kemaskini status');
    }
  };

  const handleMarkCollected = async (id: string) => {
    try {
      // Call API to mark as collected
      const updated = await markAsCollected(id);
      
      // Update local state
      setApplications(prev => prev.map(app => 
        app.id === id ? updated : app
      ));
      
      toast.success('Status dikemaskini: Telah Diambil');
    } catch (error: any) {
      console.error('Error marking collected:', error);
      toast.error(error.message || 'Ralat semasa kemaskini status');
    }
  };

  // Open edit modal with current application data
  const handleOpenEditModal = (app: Application) => {
    setSelectedApp(app);
    
    // Parse address
    let street = '';
    let mukim = '';
    let poskod = '';
    let daerah = 'Hulu Selangor';
    let negeri = 'Selangor';

    if (typeof app.pemohon.address === 'object' && app.pemohon.address !== null) {
      street = app.pemohon.address.street || '';
      mukim = app.pemohon.address.mukim || app.mukim || '';
      poskod = app.pemohon.address.poskod || '';
      daerah = app.pemohon.address.daerah || app.daerah || 'Hulu Selangor';
      negeri = app.pemohon.address.negeri || 'Selangor';
    } else {
      // Fallback for string address
      street = app.pemohon.address || '';
      mukim = app.mukim || '';
      daerah = app.daerah || 'Hulu Selangor';
    }

    setEditFormData({
      name: app.pemohon.name || '',
      ic: app.pemohon.ic || '',
      okuCard: app.pemohon.okuCard || '',
      taxAccount: app.pemohon.taxAccount || '',
      phone: app.pemohon.phone || '',
      carReg: app.pemohon.carReg || '',
      okuCategory: app.pemohon.okuCategory || '',
      street,
      mukim,
      poskod,
      daerah,
      negeri,
    });
    setEditLatitude(app.latitude ?? null);
    setEditLongitude(app.longitude ?? null);
    setEditDaerah(app.daerah || '');
    setEditMukim(app.mukim || '');
    setShowEditModal(true);
  };

  // Save edited application data
  const handleSaveEdit = async () => {
    if (!selectedApp) return;
    
    setIsUpdating(true);
    try {
      const fullAddress = `${editFormData.street}, ${editFormData.mukim}, ${editFormData.poskod} ${editFormData.daerah}, ${editFormData.negeri}`;
      
      const updatedPemohon = {
        name: editFormData.name,
        ic: editFormData.ic,
        okuCard: editFormData.okuCard,
        taxAccount: editFormData.taxAccount,
        phone: editFormData.phone,
        carReg: editFormData.carReg,
        okuCategory: editFormData.okuCategory,
        address: {
          street: editFormData.street,
          mukim: editFormData.mukim,
          daerah: editFormData.daerah,
          poskod: editFormData.poskod,
          negeri: editFormData.negeri,
          full_address: fullAddress
        },
      };

      const updates: Partial<Application> = {
        pemohon: updatedPemohon,
        latitude: editLatitude ?? undefined,
        longitude: editLongitude ?? undefined,
        daerah: editFormData.daerah || undefined,
        mukim: editFormData.mukim || undefined,
      };

      const updated = await updateApplication(selectedApp.id, updates);
      
      // Update local state
      setApplications(prev => prev.map(app => 
        app.id === selectedApp.id ? updated : app
      ));
      
      toast.success(language === 'en' ? 'Application updated successfully' : 'Permohonan berjaya dikemaskini');
      setShowEditModal(false);
      setSelectedApp(null);
    } catch (error: any) {
      console.error('Error updating application:', error);
      toast.error(error.message || (language === 'en' ? 'Error updating application' : 'Ralat semasa kemaskini permohonan'));
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    // Handle both old and new status values
    const normalizedStatus = status === 'Tidak Berjaya' ? 'Tidak Lengkap' : status;
    
    switch (normalizedStatus) {
      case 'Pending':
      case 'Dalam Proses':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Dalam Proses</Badge>;
      case 'Approved':
      case 'Diluluskan':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Diluluskan</Badge>;
      case 'Tidak Lengkap':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Tidak Lengkap</Badge>;
      case 'Sedia Diambil':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Sedia Diambil</Badge>;
      case 'Telah Diambil':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Telah Diambil</Badge>;
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
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{t('admin.title')}</h1>
              <p className="text-muted-foreground">{t('admin.subtitle')}</p>
            </div>
            <div className="flex gap-2">
              {isAdminBoss && (
                <Button variant="outline" onClick={() => router.push('/admin/manage-admins')}>
                  {language === 'en' ? 'Manage Admins' : 'Urus Admin'}
                </Button>
              )}
              <Button variant="outline" onClick={handleLogout}>
                {t('admin.logout')}
              </Button>
            </div>
          </div>

          {/* Export CSV - MOVED TO TOP */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t('admin.export')}</CardTitle>
              <CardDescription>{language === 'en' ? 'Select session to export' : 'Pilih sesi untuk eksport'}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">{language === 'en' ? 'Session' : 'Sesi'}</Label>
                  <Select value={csvSessionFilter} onValueChange={setCsvSessionFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'en' ? 'All Sessions' : 'Semua Sesi'}</SelectItem>
                      {getUniqueSessions().map(session => (
                        <SelectItem key={session} value={session}>
                          Sesi {session}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleExportCSV} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    {t('admin.download')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KML Download Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                {language === 'en' ? 'Download Interactive Map (KML)' : 'Muat Turun Peta Interaktif (KML)'}
              </CardTitle>
              <CardDescription>
                {language === 'en' 
                  ? 'Download successful applications map data in KML format (same as dashboard interactive map)' 
                  : 'Muat turun data peta permohonan berjaya dalam format KML (sama seperti peta interaktif dashboard)'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label className="mb-2 block">{language === 'en' ? 'Session' : 'Sesi'}</Label>
                  <Select value={kmlSession} onValueChange={setKmlSession}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'en' ? 'All Sessions' : 'Semua Sesi'}</SelectItem>
                      {getKMLSessions().map(session => (
                        <SelectItem key={session} value={session}>
                          Sesi {session}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">{language === 'en' ? 'Mukim' : 'Mukim'}</Label>
                  <Select value={kmlMukim} onValueChange={setKmlMukim}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'en' ? 'All Mukims' : 'Semua Mukim'}</SelectItem>
                      {getUniqueMukims().map(mukim => (
                        <SelectItem key={mukim} value={mukim}>
                          {mukim}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleKMLDownload} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    {language === 'en' ? 'Download KML' : 'Muat Turun KML'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Number Series Management */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{language === 'en' ? 'Session Number Series Management' : 'Urusan Siri Nombor Mengikut Sesi'}</CardTitle>
              <CardDescription>
                {language === 'en'
                  ? 'Set the maximum serial capacity per session. Existing issued serials remain unchanged.'
                  : 'Tetapkan kapasiti maksimum siri nombor bagi setiap sesi. Nombor siri yang telah dikeluarkan kekal.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                <div>
                  <Label className="mb-2 block">{language === 'en' ? 'Session' : 'Sesi'}</Label>
                  <Select
                    value={getSessionString(selectedSessionYear)}
                    onValueChange={(val) => {
                      const yr = parseInt(val.split('/')[0]);
                      if (!isNaN(yr)) setSelectedSessionYear(yr);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getUniqueSessions().map(session => (
                        <SelectItem key={session} value={session}>{session}</SelectItem>
                      ))}
                      {!getUniqueSessions().includes(getSessionString(selectedSessionYear)) && (
                        <SelectItem value={getSessionString(selectedSessionYear)}>
                          {getSessionString(selectedSessionYear)}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">{language === 'en' ? 'Issued' : 'Telah Dikeluarkan'}</Label>
                  <Input value={issuedCount} disabled className="bg-muted" />
                </div>
                <div>
                  <Label className="mb-2 block">{language === 'en' ? 'Capacity (Max)' : 'Kapasiti (Maks)'} </Label>
                  <Input
                    type="number"
                    value={capacityInput}
                    onChange={(e) => setCapacityInput(e.target.value)}
                    min={issuedCount}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={sessionLoading || !capacityInput || isNaN(parseInt(capacityInput)) || parseInt(capacityInput) < issuedCount}
                    onClick={async () => {
                      try {
                        setSessionLoading(true);
                        const nextCap = parseInt(capacityInput);
                        await setSessionCapacity(selectedSessionYear, nextCap);
                        const [cap, issued] = await Promise.all([
                          getSessionCapacity(selectedSessionYear),
                          getIssuedCount(selectedSessionYear),
                        ]);
                        setSessionCapacityState(cap);
                        setIssuedCountState(issued);
                        setCapacityInput(String(cap));
                        toast.success(language === 'en' ? 'Capacity updated' : 'Kapasiti dikemaskini');
                      } catch (e: any) {
                        toast.error(e.message || (language === 'en' ? 'Failed to update capacity' : 'Gagal kemaskini kapasiti'));
                      } finally {
                        setSessionLoading(false);
                      }
                    }}
                  >
                    {sessionLoading ? (language === 'en' ? 'Saving...' : 'Menyimpan...') : (language === 'en' ? 'Update Capacity' : 'Kemaskini Kapasiti')}
                  </Button>
                </div>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                {language === 'en'
                  ? 'Note: Increasing capacity allows more future serials. Reducing capacity will not delete existing serials; it only limits new serials.'
                  : 'Nota: Menaikkan kapasiti membenarkan lebih banyak siri pada masa hadapan. Mengurangkan kapasiti tidak memadam siri sedia ada; ia hanya menghadkan siri baharu.'}
              </div>
            </CardContent>
          </Card>

          {/* Search & Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t('admin.searchFilter')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-x-2 gap-y-3">
                <div className="md:col-span-2">
                  <Label className="mb-2 block">{t('admin.searchLabel')}</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('admin.searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full"
                    />
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">{t('admin.status')}</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('admin.all')}</SelectItem>
                      <SelectItem value="Dalam Proses">{t('status.dalamProses')}</SelectItem>
                      <SelectItem value="Diluluskan">{t('status.diluluskan')}</SelectItem>
                      <SelectItem value="Sedia Diambil">{t('status.sediaDiambil')}</SelectItem>
                      <SelectItem value="Telah Diambil">{t('status.telahDiambil')}</SelectItem>
                      <SelectItem value="Tidak Lengkap">Tidak Lengkap</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">{language === 'en' ? 'Session' : 'Sesi'}</Label>
                  <Select value={sessionFilter} onValueChange={setSessionFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'en' ? 'All' : 'Semua'}</SelectItem>
                      {getUniqueSessions().map(session => (
                        <SelectItem key={session} value={session}>
                          {session}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Applications Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.applicationList')} ({filteredApps.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">{t('admin.loading')}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table className="min-w-[1000px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">{language === 'en' ? 'No. Id' : 'No. Id'}</TableHead>
                        <TableHead className="whitespace-nowrap">{t('admin.serialNo')}</TableHead>
                        <TableHead className="whitespace-nowrap">{language === 'en' ? 'Application' : 'Permohonan'}</TableHead>
                        <TableHead className="text-right whitespace-nowrap">{t('admin.actions')}</TableHead>
                        <TableHead className="whitespace-nowrap">{language === 'en' ? 'Stage' : 'Peringkat'}</TableHead>
                        <TableHead className="whitespace-nowrap">{language === 'en' ? 'Status' : 'Status'}</TableHead>
                        <TableHead className="whitespace-nowrap">{language === 'en' ? 'Month Applied' : 'Bulan Mohon'}</TableHead>
                        <TableHead className="whitespace-nowrap">{language === 'en' ? 'Year Applied' : 'Tahun Mohon'}</TableHead>
                        <TableHead className="whitespace-nowrap min-w-[200px]">{t('admin.name')}</TableHead>
                        <TableHead className="whitespace-nowrap">{t('admin.icNo')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApps.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {t('admin.noApplications')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredApps.map((app, index) => {
                        const submittedDate = new Date(app.submitted_date);
                        const monthNames = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
                        const bulanMohon = monthNames[submittedDate.getMonth()];
                        const tahunMohon = submittedDate.getFullYear();
                        
                        // Determine Status (Aktif/Tidak Aktif)
                        const isAktif = (app.status === 'Diluluskan' || app.status === 'Sedia Diambil' || app.status === 'Telah Diambil') && 
                                       (!app.expiry_date || new Date(app.expiry_date) >= new Date());
                        
                        // Generate No. Id in format OKU0000001
                        const noId = `OKU${String(index + 1).padStart(7, '0')}`;
                        
                        return (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium whitespace-nowrap font-mono">{noId}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {app.no_siri ? (
                              <span className="font-mono text-sm bg-green-50 text-green-700 px-2 py-1 rounded">
                                {app.no_siri}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{getTypeBadge(app.application_type)}</TableCell>
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
                              {app.status === 'Dalam Proses' && (
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
                              
                              {app.status === 'Diluluskan' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-blue-600 hover:text-blue-700"
                                  onClick={() => handleMarkReady(app.id)}
                                >
                                  📦 Sedia Diambil
                                </Button>
                              )}
                              
                              {app.status === 'Sedia Diambil' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-purple-600 hover:text-purple-700"
                                  onClick={() => handleMarkCollected(app.id)}
                                >
                                  ✅ Selesai
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{getStatusBadge(app.status)}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {isAktif ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Tidak Aktif
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{bulanMohon}</TableCell>
                          <TableCell className="whitespace-nowrap">{tahunMohon}</TableCell>
                          <TableCell className="min-w-[200px]">{app.pemohon.name}</TableCell>
                          <TableCell className="font-mono text-sm whitespace-nowrap">{app.pemohon.ic}</TableCell>
                        </TableRow>
                      );
                      })
                    )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Butiran Permohonan</DialogTitle>
              </div>
              {selectedApp && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDetailModal(false);
                      handleOpenEditModal(selectedApp);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {language === 'en' ? 'Edit' : 'Kemaskini'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {language === 'en' ? 'Delete' : 'Padam'}
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              {selectedApp.no_siri && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">No. Siri</p>
                  <p className="text-lg font-bold text-green-900 font-mono">{selectedApp.no_siri}</p>
                </div>
              )}
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Maklumat Pemohon</h4>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Nama:</span> {selectedApp.pemohon.name}</div>
                  <div><span className="text-muted-foreground">IC:</span> {selectedApp.pemohon.ic}</div>
                  <div><span className="text-muted-foreground">Kad OKU:</span> {selectedApp.pemohon.okuCard}</div>
                  <div><span className="text-muted-foreground">Telefon:</span> {selectedApp.pemohon.phone}</div>
                  <div><span className="text-muted-foreground">No. Kereta:</span> {selectedApp.pemohon.carReg}</div>
                  <div><span className="text-muted-foreground">No. Akaun Cukai Taksiran:</span> {selectedApp.pemohon.taxAccount || '-'}</div>
                  <div><span className="text-muted-foreground">Kategori:</span> {selectedApp.pemohon.okuCategory}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Alamat:</span> {typeof selectedApp.pemohon.address === 'object' ? selectedApp.pemohon.address.full_address || `${selectedApp.pemohon.address.street}, ${selectedApp.pemohon.address.mukim}, ${selectedApp.pemohon.address.daerah}` : selectedApp.pemohon.address}</div>
                  {(selectedApp.latitude || selectedApp.longitude) && (
                    <div className="col-span-2"><span className="text-muted-foreground">Koordinat:</span> {selectedApp.latitude?.toFixed(6)}, {selectedApp.longitude?.toFixed(6)}</div>
                  )}
                  {selectedApp.mukim && (
                    <div><span className="text-muted-foreground">Mukim:</span> {selectedApp.mukim}</div>
                  )}
                  {selectedApp.daerah && (
                    <div><span className="text-muted-foreground">Daerah:</span> {selectedApp.daerah}</div>
                  )}
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

              {selectedApp.admin_notes && (
                <div className="p-4 bg-red-50 border-l-4 border-l-red-500 rounded">
                  <h4 className="font-semibold text-red-800 mb-2">Catatan Admin</h4>
                  <p className="text-sm text-red-700">{selectedApp.admin_notes}</p>
                </div>
              )}

              {/* Expiry Date Display */}
              {(selectedApp.status === 'Diluluskan' || selectedApp.status === 'Sedia Diambil' || selectedApp.status === 'Telah Diambil') && selectedApp.expiry_date && (
                <div className={`p-4 border-l-4 rounded ${
                  new Date(selectedApp.expiry_date) < new Date()
                    ? 'bg-red-50 border-l-red-500'
                    : 'bg-green-50 border-l-green-500'
                }`}>
                  <h4 className={`font-semibold mb-2 ${
                    new Date(selectedApp.expiry_date) < new Date() ? 'text-red-800' : 'text-green-800'
                  }`}>
                    {new Date(selectedApp.expiry_date) < new Date() ? '⚠️ Stiker Tamat Tempoh' : 'Tarikh Tamat Tempoh Stiker'}
                  </h4>
                  <p className={`text-sm font-mono ${
                    new Date(selectedApp.expiry_date) < new Date() ? 'text-red-700' : 'text-green-700'
                  }`}>
                    {new Date(selectedApp.expiry_date).toLocaleDateString('ms-MY')}
                  </p>
                  {new Date(selectedApp.expiry_date) < new Date() && (
                    <p className="text-xs text-red-600 mt-1">Pembaharuan diperlukan</p>
                  )}
                </div>
              )}

              {/* Documents Section */}
              {selectedApp.documents && (
                <div>
                  <h4 className="font-semibold mb-3">Dokumen Yang Dimuat Naik</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedApp.documents.icCopy && (
                      <a 
                        href={selectedApp.documents.icCopy} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-3 border rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div className="text-sm">
                          <p className="font-medium">Salinan IC</p>
                          <p className="text-xs text-muted-foreground">Klik untuk lihat</p>
                        </div>
                      </a>
                    )}
                    
                    {selectedApp.documents.okuCard && (
                      <a 
                        href={selectedApp.documents.okuCard} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-3 border rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <FileText className="w-5 h-5 text-green-600" />
                        <div className="text-sm">
                          <p className="font-medium">Kad OKU</p>
                          <p className="text-xs text-muted-foreground">Klik untuk lihat</p>
                        </div>
                      </a>
                    )}
                    
                    {selectedApp.documents.drivingLicense && (
                      <a 
                        href={selectedApp.documents.drivingLicense} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-3 border rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <FileText className="w-5 h-5 text-purple-600" />
                        <div className="text-sm">
                          <p className="font-medium">Lesen Memandu</p>
                          <p className="text-xs text-muted-foreground">Klik untuk lihat</p>
                        </div>
                      </a>
                    )}
                    
                    {selectedApp.documents.passportPhoto && (
                      <a 
                        href={selectedApp.documents.passportPhoto} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-3 border rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <ImageIcon className="w-5 h-5 text-orange-600" />
                        <div className="text-sm">
                          <p className="font-medium">Gambar Passport</p>
                          <p className="text-xs text-muted-foreground">Klik untuk lihat</p>
                        </div>
                      </a>
                    )}
                    
                    {selectedApp.documents.tanggunganSignature && (
                      <a 
                        href={selectedApp.documents.tanggunganSignature} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-3 border rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <FileText className="w-5 h-5 text-red-600" />
                        <div className="text-sm">
                          <p className="font-medium">Tandatangan Penjaga</p>
                          <p className="text-xs text-muted-foreground">Klik untuk lihat</p>
                        </div>
                      </a>
                    )}
                  </div>
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
                <p className="text-sm text-blue-700">No. Id: <span className="font-semibold">{selectedApp.ref_no}</span></p>
                <p className="text-sm text-blue-700">Nama: <span className="font-semibold">{selectedApp.pemohon.name}</span></p>
                <p className="text-sm text-blue-700 mt-2">No. Siri: <span className="font-mono font-semibold">{selectedApp.no_siri || 'Akan dijana'}</span></p>
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
                <p className="text-sm text-red-700">No. Id: <span className="font-semibold">{selectedApp.ref_no}</span></p>
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

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{language === 'en' ? 'Edit Application Details' : 'Kemaskini Butiran Permohonan'}</DialogTitle>
            <DialogDescription>
              {language === 'en' ? 'Update applicant information and location' : 'Kemaskini maklumat pemohon dan lokasi'}
              {selectedApp && ` - No. Id: ${selectedApp.ref_no}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Applicant Information */}
            <div className="space-y-4">
              <h4 className="font-semibold border-b pb-2">{language === 'en' ? 'Applicant Information' : 'Maklumat Pemohon'}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">{language === 'en' ? 'Name' : 'Nama'} *</Label>
                  <Input
                    id="edit-name"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-ic">{language === 'en' ? 'IC Number' : 'No. Kad Pengenalan'} *</Label>
                  <Input
                    id="edit-ic"
                    value={editFormData.ic}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, ic: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-okuCard">{language === 'en' ? 'OKU Card No.' : 'No. Kad OKU'} *</Label>
                  <Input
                    id="edit-okuCard"
                    value={editFormData.okuCard}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, okuCard: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-taxAccount">{language === 'en' ? 'Tax Account No.' : 'No. Akaun Cukai Taksiran'}</Label>
                  <Input
                    id="edit-taxAccount"
                    value={editFormData.taxAccount}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, taxAccount: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">{language === 'en' ? 'Phone' : 'No. Telefon'} *</Label>
                  <Input
                    id="edit-phone"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-carReg">{language === 'en' ? 'Car Registration' : 'No. Pendaftaran Kereta'} *</Label>
                  <Input
                    id="edit-carReg"
                    value={editFormData.carReg}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, carReg: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="edit-okuCategory">{language === 'en' ? 'OKU Category' : 'Kategori OKU'} *</Label>
                  <Input
                    id="edit-okuCategory"
                    value={editFormData.okuCategory}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, okuCategory: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="edit-street">{language === 'en' ? 'Street Address' : 'Alamat Jalan'} *</Label>
                      <Input
                        id="edit-street"
                        value={editFormData.street}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, street: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-mukim">{language === 'en' ? 'Mukim' : 'Mukim'} *</Label>
                      <Select 
                        value={editFormData.mukim} 
                        onValueChange={(value) => {
                          setEditFormData(prev => ({ ...prev, mukim: value }));
                          // Also update the separate mukim state for map sync if needed
                          setEditMukim(value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={language === 'en' ? 'Select Mukim' : 'Pilih Mukim'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ulu Bernam">Ulu Bernam</SelectItem>
                          <SelectItem value="Sungai Tinggi">Sungai Tinggi</SelectItem>
                          <SelectItem value="Sungai Gumut">Sungai Gumut</SelectItem>
                          <SelectItem value="Kuala Kalumpang">Kuala Kalumpang</SelectItem>
                          <SelectItem value="Kalumpang">Kalumpang</SelectItem>
                          <SelectItem value="Kerling">Kerling</SelectItem>
                          <SelectItem value="Buloh Telor">Buloh Telor</SelectItem>
                          <SelectItem value="Ampang Pechah">Ampang Pechah</SelectItem>
                          <SelectItem value="Peretak">Peretak</SelectItem>
                          <SelectItem value="Rasa">Rasa</SelectItem>
                          <SelectItem value="Batang Kali">Batang Kali</SelectItem>
                          <SelectItem value="Ulu Yam">Ulu Yam</SelectItem>
                          <SelectItem value="Serendah">Serendah</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-poskod">{language === 'en' ? 'Postcode' : 'Poskod'}</Label>
                      <Input
                        id="edit-poskod"
                        value={editFormData.poskod}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, poskod: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-daerah">{language === 'en' ? 'District' : 'Daerah'} *</Label>
                      <Input
                        id="edit-daerah"
                        value={editFormData.daerah}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, daerah: e.target.value }))}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-negeri">{language === 'en' ? 'State' : 'Negeri'} *</Label>
                      <Input
                        id="edit-negeri"
                        value={editFormData.negeri}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, negeri: e.target.value }))}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Location Map */}
            <div className="space-y-4">
              <h4 className="font-semibold border-b pb-2">{language === 'en' ? 'Location on Map' : 'Lokasi Pada Peta'}</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>{language === 'en' ? 'Latitude' : 'Latitud'}</Label>
                  <Input
                    value={editLatitude?.toFixed(6) || ''}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label>{language === 'en' ? 'Longitude' : 'Longitud'}</Label>
                  <Input
                    value={editLongitude?.toFixed(6) || ''}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label>{language === 'en' ? 'Mukim' : 'Mukim'}</Label>
                  <Input
                    value={editMukim}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label>{language === 'en' ? 'District' : 'Daerah'}</Label>
                  <Input
                    value={editDaerah}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
              <MapPicker
                lat={editLatitude ?? undefined}
                lon={editLongitude ?? undefined}
                showInstructions={true}
                height={350}
                onLocationChange={(loc) => {
                  setEditLatitude(loc.lat);
                  setEditLongitude(loc.lon);
                  if (loc.daerah) setEditDaerah(loc.daerah);
                  if (loc.mukim) setEditMukim(loc.mukim);
                }}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={isUpdating}>
              <X className="w-4 h-4 mr-2" />
              {language === 'en' ? 'Cancel' : 'Batal'}
            </Button>
            <Button onClick={handleSaveEdit} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {language === 'en' ? 'Saving...' : 'Menyimpan...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {language === 'en' ? 'Save Changes' : 'Simpan Perubahan'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">
              {language === 'en' ? 'Delete Application' : 'Padam Permohonan'}
            </DialogTitle>
            <DialogDescription>
              {language === 'en' 
                ? 'Are you sure you want to delete this application? This action cannot be undone.'
                : 'Adakah anda pasti mahu memadam permohonan ini? Tindakan ini tidak boleh dibatalkan.'}
            </DialogDescription>
          </DialogHeader>
          {selectedApp && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                <span className="font-medium">{language === 'en' ? 'ID No:' : 'No. Id:'}</span> {selectedApp.ref_no}
              </p>
              <p className="text-sm text-red-700">
                <span className="font-medium">{language === 'en' ? 'Name:' : 'Nama:'}</span> {selectedApp.pemohon.name}
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              {language === 'en' ? 'Cancel' : 'Batal'}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteApplication}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  {language === 'en' ? 'Deleting...' : 'Memadam...'}
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {language === 'en' ? 'Delete' : 'Padam'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </>
  );
}
