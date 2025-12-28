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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Download, Eye, CheckCircle, XCircle, Calendar, FileText, Image as ImageIcon, Map, Edit, Save, X, Trash2, Upload, Copy, AlertCircle, Users, LogOut, Undo } from 'lucide-react';
import { toast } from 'sonner';
import { generateNoSiri } from '@/lib/generateNoSiri';
import { exportBySession } from '@/lib/csvExport';
import { useLanguage } from '@/contexts/LanguageContext';
import { getApplications, approveApplication as approveApp, rejectApplication as rejectApp, markAsReady, markAsCollected, updateApplication, deleteApplication, uploadFile, bulkImportApplications } from '@/lib/api/applications';
import { updateOkuCategoryFromSessionToLainLain } from '@/lib/api/updateOkuCategory';
import MapPicker from '@/components/MapPicker';
import { getIssuedCount, getSessionCapacity, setSessionCapacity, getSessionPrefix, setSessionConfig } from '@/lib/api/session';
import type { Application } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { formatIC } from '@/lib/formatters';

// No mock data - using Supabase only

export default function AdminPanel() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [permohonanFilter, setPermohonanFilter] = useState('all');
  const [peringkatFilter, setPeringkatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bulanMohonFilter, setBulanMohonFilter] = useState('all');
  const [tahunMohonFilter, setTahunMohonFilter] = useState('all');
  // Serial Number Configuration state
  const currentYear = new Date().getFullYear();
  const [serialPrefix, setSerialPrefix] = useState<string>('MPHS');
  const [serialYear, setSerialYear] = useState<string>(currentYear.toString());
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
  
  // Selection state
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  
  // Toggle row selection
  const toggleRowSelection = (appId: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(appId)) {
        newSet.delete(appId);
      } else {
        newSet.add(appId);
      }
      return newSet;
    });
  };
  
  // Select all rows
  const toggleSelectAll = () => {
    if (selectedRows.size === paginatedApps.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedApps.map(app => app.id)));
    }
  };
  
  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedRows.size === 0) {
      toast.error(language === 'en' ? 'Please select applications to delete' : 'Sila pilih permohonan untuk dipadam');
      return;
    }
    setShowBulkDeleteDialog(true);
  };

  const confirmBulkDelete = async () => {
    try {
      const count = selectedRows.size;
      for (const id of selectedRows) {
        await deleteApplication(id);
      }
      
      setApplications(prev => prev.filter(app => !selectedRows.has(app.id)));
      setSelectedRows(new Set());
      toast.success(`${count} ${language === 'en' ? 'applications deleted' : 'permohonan dipadam'}`);
    } catch (error: any) {
      console.error('Error deleting applications:', error);
      toast.error(error.message || (language === 'en' ? 'Error deleting applications' : 'Ralat semasa memadam permohonan'));
    } finally {
      setShowBulkDeleteDialog(false);
    }
  };
  
  // Handle bulk copy
  const handleBulkCopy = () => {
    if (selectedRows.size === 0) {
      toast.error(language === 'en' ? 'Please select applications to copy' : 'Sila pilih permohonan untuk disalin');
      return;
    }
    
    const selectedApps = applications.filter(app => selectedRows.has(app.id));
    const copyData = selectedApps.map(app => 
      `No. Id: ${generateNoId(app)}\nNo. Siri: ${app.no_siri || '-'}\nNama: ${app.pemohon.name}\nNo. IC: ${formatIC(app.pemohon.ic)}\nJenis: ${app.application_type === 'baru' ? 'Baharu' : 'Pembaharuan'}\nStatus: ${app.status}`
    ).join('\n\n---\n\n');
    
    navigator.clipboard.writeText(copyData);
    toast.success(`${selectedRows.size} ${language === 'en' ? 'applications copied to clipboard' : 'permohonan disalin ke papan klip'}`);
  };
  
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
      
      // Load session configuration (capacity and prefix)
      const yearToUse = parseInt(serialYear) || currentYear;
      const [cap, issued, prefix] = await Promise.all([
        getSessionCapacity(yearToUse),
        getIssuedCount(yearToUse),
        getSessionPrefix(yearToUse),
      ]);
      setSessionCapacityState(cap);
      setIssuedCountState(issued);
      setCapacityInput(String(cap));
      setSerialPrefix(prefix);
      
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

  // Generate No. Id dynamically based on submitted_date order (latest = highest number)
  const generateNoId = (app: Application): string => {
    // Sort all applications by submitted_date (descending - latest first)
    const sortedApps = [...applications].sort((a, b) => 
      new Date(b.submitted_date).getTime() - new Date(a.submitted_date).getTime()
    );
    
    // Find the index of current application
    const index = sortedApps.findIndex(a => a.id === app.id);
    
    // Generate OKU ID with 7 digits - latest gets highest number
    return `OKU${(sortedApps.length - index).toString().padStart(7, '0')}`;
  };

  // Reverse status to previous state
  const handleReverseStatus = async (app: Application) => {
    try {
      let newStatus: Application['status'];
      let updateData: any = {};
      
      // Determine previous status based on current status
      if (app.status === 'Telah Diambil') {
        newStatus = 'Sedia Diambil';
        updateData = { status: newStatus, collected_date: null };
      } else if (app.status === 'Sedia Diambil') {
        newStatus = 'Diluluskan';
        updateData = { status: newStatus, ready_date: null };
      } else if (app.status === 'Diluluskan') {
        newStatus = 'Dalam Proses';
        updateData = { status: newStatus, approved_date: null, expiry_date: null, no_siri: null };
      } else if (app.status === 'Tidak Berjaya') {
        newStatus = 'Dalam Proses';
        updateData = { status: newStatus, admin_notes: null };
      } else {
        toast.error('Tidak boleh undur status ini');
        return;
      }

      // Update in database
      const { data, error } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', app.id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update local state
      setApplications(prev => prev.map(a => 
        a.id === app.id ? data as Application : a
      ));
      
      toast.success(`Status diundur ke: ${newStatus}`);
    } catch (error: any) {
      console.error('Error reversing status:', error);
      toast.error(error.message || 'Ralat semasa mengundur status');
    }
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

  // Get unique sessions from real applications data
  const getKMLSessions = () => {
    const sessions = new Set<string>();
    applications.forEach(app => {
      if (app.approved_date && isSuccessStatus(app.status)) {
        const year = new Date(app.approved_date).getFullYear();
        sessions.add(`${year}/${year + 2}`);
      }
    });
    return Array.from(sessions).sort().reverse();
  };

  // Helper to check if status is successful (same as dashboard)
  const isSuccessStatus = (status: string) => ['Diluluskan', 'Sedia Diambil', 'Telah Diambil'].includes(status);

  // Handle KML download - ONLY successful applications (same as dashboard map)
  const handleKMLDownload = async () => {
    try {
      const { generateKML } = await import('@/lib/kml');
      
      // Filter applications - ONLY SUCCESSFUL (Berjaya) apps with coordinates
      let filteredApps = applications.filter(app => {
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
  
  // Edit wizard step state (for 3-page wizard)
  const [editStep, setEditStep] = useState(1); // 1 = Maklumat Pemohon, 2 = Lokasi & Peta, 3 = Dokumen
  
  // Document upload state
  const [editDocuments, setEditDocuments] = useState<{
    icCopy: File | null;
    okuCard: File | null;
    drivingLicense: File | null;
    passportPhoto: File | null;
    tanggunganSignature: File | null;
  }>({
    icCopy: null,
    okuCard: null,
    drivingLicense: null,
    passportPhoto: null,
    tanggunganSignature: null,
  });
  const [currentDocUrls, setCurrentDocUrls] = useState<{
    icCopy: string;
    okuCard: string;
    drivingLicense: string;
    passportPhoto: string;
    tanggunganSignature?: string;
  }>({
    icCopy: '',
    okuCard: '',
    drivingLicense: '',
    passportPhoto: '',
    tanggunganSignature: '',
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Bulk import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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


  // Handle bulk import from CSV/Excel
  const handleBulkImport = async () => {
    if (!importFile) {
      toast.error(language === 'en' ? 'Please select a file' : 'Sila pilih fail');
      return;
    }

    console.log('🔄 Starting CSV/Excel import...');
    console.log('📁 File:', importFile.name, 'Size:', importFile.size);

    setIsImporting(true);
    try {
      // Dynamically import xlsx library
      const XLSX = await import('xlsx');
      console.log('✅ XLSX library loaded');
      
      // Read the file
      const data = await importFile.arrayBuffer();
      console.log('✅ File read as array buffer, size:', data.byteLength);
      
      const workbook = XLSX.read(data, { type: 'array' });
      console.log('✅ Workbook parsed, sheets:', workbook.SheetNames);
      
      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      console.log('✅ Using sheet:', sheetName);
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      console.log('✅ Converted to JSON, records:', jsonData.length);
      console.log('📊 First record sample:', jsonData[0]);
      
      if (jsonData.length === 0) {
        toast.error(language === 'en' ? 'No data found in file' : 'Tiada data dijumpai dalam fail');
        setIsImporting(false);
        return;
      }

      // Validate CSV columns match expected format
      const expectedColumns = [
        'No. Siri',
        'Jenis',
        'No. IC',
        'Nama',
        'No. Kad OKU',
        'No. Tel',
        'No. Kereta',
        'Kategori OKU',
        'No. Akaun Cukai Taksiran',
        'Alamat',
        'Status',
        'Tarikh Mohon',
        'Tarikh Lulus',
        'Tarikh Tamat Tempoh',
        'Sesi'
      ];
      
      const firstRow = jsonData[0] as any;
      const actualColumns = Object.keys(firstRow);
      
      console.log('📋 Expected columns:', expectedColumns);
      console.log('📋 Actual columns from file:', actualColumns);
      
      // Normalize column names for comparison (trim spaces, normalize case)
      const normalizeCol = (col: string) => col.trim().toLowerCase().replace(/\s+/g, ' ');
      
      // Create flexible column mapping - accept variations (case-insensitive)
      const columnAliases: Record<string, string[]> = {
        'No. Siri': ['no. siri', 'no siri', 'siri', 'no.siri', 'nosiri'],
        'Jenis': ['jenis', 'type', 'jenis permohonan'],
        'No. IC': ['no. ic', 'no ic', 'ic', 'no.ic', 'mykad', 'noic'],
        'Nama': ['nama', 'name'],
        'No. Kad OKU': ['no. kad oku', 'no kad oku', 'kad oku', 'no.kad oku', 'oku card', 'nokadoku'],
        'No. Tel': ['no. tel', 'no tel', 'tel', 'telefon', 'phone', 'no. fon', 'no fon', 'no.tel', 'notel'],
        'No. Kereta': ['no. kereta', 'no kereta', 'kereta', 'no. plat', 'no plat', 'plat', 'no.kereta', 'nokereta'],
        'Kategori OKU': ['kategori oku', 'kategori', 'jenis oku', 'oku category', 'kategorioku'],
        'No. Akaun Cukai Taksiran': ['no. akaun cukai taksiran', 'no akaun cukai taksiran', 'akaun cukai', 'cukai taksiran', 'tax account'],
        'Alamat': ['alamat', 'address'],
        'Status': ['status'],
        'Tarikh Mohon': ['tarikh mohon', 'tarikh permohonan', 'date applied', 'tarikh mo', 'tarikhmohon'],
        'Tarikh Lulus': ['tarikh lulus', 'tarikh lulusan', 'date approved', 'tarikh lu', 'tarikhlulus', 'tarikhlulusan'],
        'Tarikh Tamat Tempoh': ['tarikh tamat tempoh', 'tarikh luput', 'expiry date', 'tarikh tamat', 'tarikhtamattempoh'],
        'Sesi': ['sesi', 'session', 'tahun sesi', 'tahun']
      };
      
      // Map actual columns to expected columns using aliases
      const columnMapping: Record<string, string> = {};
      actualColumns.forEach(actual => {
        const normalizedActual = normalizeCol(actual);
        for (const [expected, aliases] of Object.entries(columnAliases)) {
          if (aliases.includes(normalizedActual)) {
            columnMapping[actual] = expected;
            break;
          }
        }
      });
      
      console.log('🔄 Column mapping:', columnMapping);
      
      // Check if all expected columns are mapped
      const mappedExpected = Object.values(columnMapping);
      const missingColumns = expectedColumns.filter(col => !mappedExpected.includes(col));
      const unmappedActual = actualColumns.filter(col => !columnMapping[col]);
      
      if (missingColumns.length > 0) {
        toast.error(
          language === 'en' 
            ? 'Format CSV tidak lengkap. Sila muat turun templat yang betul.' 
            : 'Format CSV tidak lengkap. Sila muat turun templat yang betul.',
          { 
            duration: 5000,
            closeButton: true,
            dismissible: true,
            position: 'top-center'
          }
        );
        setIsImporting(false);
        return;
      }
      
      // Remap the data to use standard column names
      console.log('🔄 Remapping data to standard column names...');
      const remappedData = jsonData.map((row: any) => {
        const newRow: any = {};
        Object.keys(row).forEach(key => {
          const standardKey = columnMapping[key] || key;
          newRow[standardKey] = row[key];
        });
        return newRow;
      });
      
      console.log('✅ Data remapped, sample:', remappedData[0]);

      toast.info(`${language === 'en' ? 'Processing' : 'Memproses'} ${remappedData.length} ${language === 'en' ? 'records' : 'rekod'}...`);
      
      // Call bulk import API with remapped data
      console.log('🚀 Calling bulkImportApplications...');
      const results = await bulkImportApplications(remappedData);
      console.log('✅ Import completed:', results);
      
      // Show results
      if (results.success > 0) {
        toast.success(`${language === 'en' ? 'Successfully imported' : 'Berjaya diimport'}: ${results.success} ${language === 'en' ? 'records' : 'rekod'}`);
      }
      
      if (results.failed > 0) {
        toast.error(
          `${results.failed} rekod gagal diimport. Sila semak format data.`,
          { 
            duration: 5000,
            closeButton: true,
            dismissible: true,
            position: 'top-center'
          }
        );
        console.error('❌ Import errors:', results.errors);
      }
      
      // Reload applications
      console.log('🔄 Reloading applications...');
      await loadApplications();
      console.log('✅ Applications reloaded');
      
      // Close modal
      setShowImportModal(false);
      setImportFile(null);
    } catch (error: any) {
      console.error('❌ Error importing file:', error);
      console.error('Error stack:', error.stack);
      toast.error(error.message || (language === 'en' ? 'Error importing file' : 'Ralat semasa mengimport fail'));
    } finally {
      setIsImporting(false);
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

  // Load session capacity/issued when serial year changes
  useEffect(() => {
    const yearToUse = parseInt(serialYear) || currentYear;
    setSessionLoading(true);
    Promise.all([getSessionCapacity(yearToUse), getIssuedCount(yearToUse)])
      .then(([cap, issued]) => {
        setSessionCapacityState(cap);
        setIssuedCountState(issued);
        setCapacityInput(String(cap));
      })
      .finally(() => setSessionLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialYear, applications.length]);

  // Filter applications
  const filteredApps = applications.filter((app) => {
    const noId = generateNoId(app);
    const matchesSearch =
      noId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.no_siri?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      app.pemohon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.pemohon.ic.includes(searchQuery);
    
    // Permohonan filter (Baharu/Pembaharuan)
    const matchesPermohonan = permohonanFilter === 'all' || app.application_type === permohonanFilter;
    
    // Peringkat filter (specific status - same as old Status filter)
    const normalizedStatus = app.status === 'Tidak Berjaya' ? 'Tidak Lengkap' : app.status;
    const matchesPeringkat = peringkatFilter === 'all' || 
                            (peringkatFilter === 'Tidak Lengkap' && (normalizedStatus === 'Tidak Lengkap' || app.status === 'Tidak Berjaya')) ||
                            normalizedStatus === peringkatFilter;
    
    // Status filter (Aktif/Tidak Aktif only)
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      const isAktif = (app.status === 'Diluluskan' || app.status === 'Sedia Diambil' || app.status === 'Telah Diambil') && 
                     (!app.expiry_date || new Date(app.expiry_date) >= new Date());
      if (statusFilter === 'Aktif') {
        matchesStatus = isAktif;
      } else if (statusFilter === 'Tidak Aktif') {
        matchesStatus = !isAktif;
      }
    }
    
    // Bulan Mohon filter
    const submittedDate = new Date(app.submitted_date);
    const bulanMohon = submittedDate.getMonth() + 1; // 1-12
    const matchesBulanMohon = bulanMohonFilter === 'all' || parseInt(bulanMohonFilter) === bulanMohon;
    
    // Tahun Mohon filter
    const tahunMohon = submittedDate.getFullYear();
    const matchesTahunMohon = tahunMohonFilter === 'all' || parseInt(tahunMohonFilter) === tahunMohon;
    
    return matchesSearch && matchesPermohonan && matchesPeringkat && matchesStatus && matchesBulanMohon && matchesTahunMohon;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredApps.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedApps = filteredApps.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, permohonanFilter, peringkatFilter, statusFilter, bulanMohonFilter, tahunMohonFilter]);

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
    // Export based on current filters (filteredApps)
    if (filteredApps.length === 0) {
      toast.error('Tiada data untuk dimuat turun');
      return;
    }

    // Use filtered applications
    exportBySession(filteredApps, 'all');
    toast.success(`CSV berjaya dimuat turun (${filteredApps.length} rekod)`);
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
    
    // Load current document URLs
    setCurrentDocUrls({
      icCopy: app.documents.icCopy || '',
      okuCard: app.documents.okuCard || '',
      drivingLicense: app.documents.drivingLicense || '',
      passportPhoto: app.documents.passportPhoto || '',
      tanggunganSignature: app.documents.tanggunganSignature || '',
    });
    
    // Reset document files
    setEditDocuments({
      icCopy: null,
      okuCard: null,
      drivingLicense: null,
      passportPhoto: null,
      tanggunganSignature: null,
    });
    
    // Reset wizard to step 1
    setEditStep(1);
    
    setShowEditModal(true);
  };

  // Save edited application data
  const handleSaveEdit = async () => {
    if (!selectedApp) return;
    
    setIsUpdating(true);
    try {
      const fullAddress = `${editFormData.street}, ${editFormData.mukim}, ${editFormData.poskod} ${editFormData.daerah}, ${editFormData.negeri}`;
      
      // Upload new documents if provided
      const uploadedDocs: any = {
        icCopy: currentDocUrls.icCopy,
        okuCard: currentDocUrls.okuCard,
        drivingLicense: currentDocUrls.drivingLicense,
        passportPhoto: currentDocUrls.passportPhoto,
        tanggunganSignature: currentDocUrls.tanggunganSignature,
      };

      // Upload new documents if they were changed (use app.id for path since ref_no is optional)
      if (editDocuments.icCopy) {
        toast.info(language === 'en' ? 'Uploading IC copy...' : 'Memuat naik salinan IC...');
        uploadedDocs.icCopy = await uploadFile(editDocuments.icCopy, `${selectedApp.id}/ic-copy`);
      }
      if (editDocuments.okuCard) {
        toast.info(language === 'en' ? 'Uploading OKU card...' : 'Memuat naik kad OKU...');
        uploadedDocs.okuCard = await uploadFile(editDocuments.okuCard, `${selectedApp.id}/oku-card`);
      }
      if (editDocuments.drivingLicense) {
        toast.info(language === 'en' ? 'Uploading driving license...' : 'Memuat naik lesen memandu...');
        uploadedDocs.drivingLicense = await uploadFile(editDocuments.drivingLicense, `${selectedApp.id}/license`);
      }
      if (editDocuments.passportPhoto) {
        toast.info(language === 'en' ? 'Uploading passport photo...' : 'Memuat naik gambar pasport...');
        uploadedDocs.passportPhoto = await uploadFile(editDocuments.passportPhoto, `${selectedApp.id}/photo`);
      }
      if (editDocuments.tanggunganSignature) {
        toast.info(language === 'en' ? 'Uploading guardian signature...' : 'Memuat naik tandatangan tanggungan...');
        uploadedDocs.tanggunganSignature = await uploadFile(editDocuments.tanggunganSignature, `${selectedApp.id}/tanggungan-signature`);
      }
      
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
        documents: uploadedDocs,
        latitude: editLatitude ?? undefined,
        longitude: editLongitude ?? undefined,
        daerah: editFormData.daerah || undefined,
        mukim: editFormData.mukim || undefined,
      };

      toast.info(language === 'en' ? 'Saving changes...' : 'Menyimpan perubahan...');
      const updated = await updateApplication(selectedApp.id, updates);
      
      // Update local state
      if (!updated) {
        throw new Error('No updates were applied');
      }
      
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
              <h1 className="text-3xl font-bold mb-2">{isAdminBoss ? (language === 'en' ? 'Super Admin' : 'Super Admin') : t('admin.title')}</h1>
              <p className="text-muted-foreground">{t('admin.subtitle')}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {isAdminBoss && (
                <>
                  <Button onClick={() => router.push('/admin/manage-admins')} className="h-9 w-full sm:w-auto whitespace-nowrap">
                    {language === 'en' ? 'Manage Admins' : 'Urus Admin'}
                  </Button>
                  <Button onClick={() => router.push('/admin/manage-footer')} className="h-9 w-full sm:w-auto whitespace-nowrap">
                    {language === 'en' ? 'Footer' : 'Footer'}
                  </Button>
                </>
              )}
              <Button variant="destructive" onClick={handleLogout} className="h-9 w-full sm:w-auto whitespace-nowrap">
                {t('admin.logout')}
              </Button>
            </div>
          </div>

          {/* Carian & Tapisan - MOVED TO TOP */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{language === 'en' ? 'Search & Filters' : 'Carian & Tapisan'}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Search Bar */}
              <div className="mb-4">
                <Label className="mb-2 block">{language === 'en' ? 'Search (No. Id, No. Siri, IC, Name)' : 'Cari (No Id, No Siri, IC, Nama)'}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('admin.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-10 w-full"
                  />
                </div>
              </div>
              
              {/* Tapisan Section */}
              <div>
                <Label className="mb-2 block font-semibold">{language === 'en' ? 'Filters' : 'Tapisan'}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                  {/* Permohonan */}
                  <div>
                    <Label className="mb-2 block">{language === 'en' ? 'Application' : 'Permohonan'}</Label>
                    <Select value={permohonanFilter} onValueChange={setPermohonanFilter}>
                      <SelectTrigger className="w-full h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{language === 'en' ? 'All' : 'Semua'}</SelectItem>
                        <SelectItem value="baru">{language === 'en' ? 'New' : 'Baharu'}</SelectItem>
                        <SelectItem value="pembaharuan">{language === 'en' ? 'Renewal' : 'Pembaharuan'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Peringkat */}
                  <div>
                    <Label className="mb-2 block">{language === 'en' ? 'Stage' : 'Peringkat'}</Label>
                    <Select value={peringkatFilter} onValueChange={setPeringkatFilter}>
                      <SelectTrigger className="w-full h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{language === 'en' ? 'All' : 'Semua'}</SelectItem>
                        <SelectItem value="Dalam Proses">{t('status.dalamProses')}</SelectItem>
                        <SelectItem value="Diluluskan">{t('status.diluluskan')}</SelectItem>
                        <SelectItem value="Sedia Diambil">{t('status.sediaDiambil')}</SelectItem>
                        <SelectItem value="Telah Diambil">{t('status.telahDiambil')}</SelectItem>
                        <SelectItem value="Tidak Lengkap">Tidak Lengkap</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Status */}
                  <div>
                    <Label className="mb-2 block">{language === 'en' ? 'Status' : 'Status'}</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{language === 'en' ? 'All' : 'Semua'}</SelectItem>
                        <SelectItem value="Aktif">{language === 'en' ? 'Active' : 'Aktif'}</SelectItem>
                        <SelectItem value="Tidak Aktif">{language === 'en' ? 'Inactive' : 'Tidak Aktif'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Bulan Mohon */}
                  <div>
                    <Label className="mb-2 block">{language === 'en' ? 'Month Applied' : 'Bulan Mohon'}</Label>
                    <Select value={bulanMohonFilter} onValueChange={setBulanMohonFilter}>
                      <SelectTrigger className="w-full h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{language === 'en' ? 'All' : 'Semua'}</SelectItem>
                        <SelectItem value="1">Januari</SelectItem>
                        <SelectItem value="2">Februari</SelectItem>
                        <SelectItem value="3">Mac</SelectItem>
                        <SelectItem value="4">April</SelectItem>
                        <SelectItem value="5">Mei</SelectItem>
                        <SelectItem value="6">Jun</SelectItem>
                        <SelectItem value="7">Julai</SelectItem>
                        <SelectItem value="8">Ogos</SelectItem>
                        <SelectItem value="9">September</SelectItem>
                        <SelectItem value="10">Oktober</SelectItem>
                        <SelectItem value="11">November</SelectItem>
                        <SelectItem value="12">Disember</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Tahun Mohon */}
                  <div>
                    <Label className="mb-2 block">{language === 'en' ? 'Year Applied' : 'Tahun Mohon'}</Label>
                    <Select value={tahunMohonFilter} onValueChange={setTahunMohonFilter}>
                      <SelectTrigger className="w-full h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{language === 'en' ? 'All' : 'Semua'}</SelectItem>
                        {Array.from(new Set(applications.map(app => new Date(app.submitted_date).getFullYear()))).sort((a, b) => b - a).map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Muat Turun CSV Button - Inline */}
                  <div>
                    <Button onClick={handleExportCSV} className="h-9 w-full">
                      <Download className="w-4 h-4 mr-2" />
                      {language === 'en' ? 'Download CSV' : 'Muat Turun CSV'} ({filteredApps.length})
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Applications Table - MOVED HERE */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('admin.applicationList')} ({filteredApps.length})</CardTitle>
                {isAdminBoss && (
                  <Button 
                    onClick={() => setShowImportModal(true)}
                    className="h-9 w-48"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {language === 'en' ? 'Import CSV/Excel' : 'Import CSV/Excel'}
                  </Button>
                )}
              </div>
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
                <>
                  {/* Bulk Actions */}
                  {selectedRows.size > 0 && (
                    <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <span className="text-sm font-medium">
                          {selectedRows.size} {language === 'en' ? 'selected' : 'dipilih'}
                        </span>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                          <Button
                            onClick={handleBulkCopy}
                            className="h-9 w-full sm:w-auto min-w-[120px]"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            {language === 'en' ? 'Copy' : 'Salin'}
                          </Button>
                          <Button
                            onClick={handleBulkDelete}
                            variant="destructive"
                            className="h-9 w-full sm:w-auto min-w-[120px]"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {language === 'en' ? 'Delete' : 'Padam'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="rounded-md border overflow-x-auto">
                  <Table className="min-w-[1000px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap w-[50px]">
                          <input
                            type="checkbox"
                            checked={selectedRows.size === paginatedApps.length && paginatedApps.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-primary text-primary focus:ring-primary cursor-pointer"
                          />
                        </TableHead>
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
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          {t('admin.noApplications')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedApps.map((app, index) => {
                        const submittedDate = new Date(app.submitted_date);
                        const monthNames = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
                        const bulanMohon = monthNames[submittedDate.getMonth()];
                        const tahunMohon = submittedDate.getFullYear();
                        
                        const isAktif = (app.status === 'Diluluskan' || app.status === 'Sedia Diambil' || app.status === 'Telah Diambil') && 
                                       (!app.expiry_date || new Date(app.expiry_date) >= new Date());
                        
                        return (
                        <TableRow key={app.id} className={selectedRows.has(app.id) ? 'bg-primary/5' : ''}>
                          <TableCell className="whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedRows.has(app.id)}
                              onChange={() => toggleRowSelection(app.id)}
                              className="w-4 h-4 rounded border-primary text-primary focus:ring-primary cursor-pointer"
                            />
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap font-mono">{generateNoId(app)}</TableCell>
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
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-blue-600 hover:text-blue-700"
                                    onClick={() => handleMarkReady(app.id)}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-orange-600 hover:text-orange-700"
                                    onClick={() => handleReverseStatus(app)}
                                    title="Undur status"
                                  >
                                    <Undo className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              {app.status === 'Sedia Diambil' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-purple-600 hover:text-purple-700"
                                    onClick={() => handleMarkCollected(app.id)}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-orange-600 hover:text-orange-700"
                                    onClick={() => handleReverseStatus(app)}
                                    title="Undur status"
                                  >
                                    <Undo className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              {app.status === 'Telah Diambil' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-orange-600 hover:text-orange-700"
                                  onClick={() => handleReverseStatus(app)}
                                  title="Undur status"
                                >
                                  <Undo className="w-4 h-4" />
                                </Button>
                              )}
                              {app.status === 'Tidak Berjaya' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-orange-600 hover:text-orange-700"
                                  onClick={() => handleReverseStatus(app)}
                                  title="Undur status"
                                >
                                  <Undo className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {app.status === 'Dalam Proses' ? (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Dalam Proses</Badge>
                            ) : app.status === 'Diluluskan' ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Diluluskan</Badge>
                            ) : app.status === 'Sedia Diambil' ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Sedia Diambil</Badge>
                            ) : app.status === 'Telah Diambil' ? (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Telah Diambil</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Tidak Lengkap</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {isAktif ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Aktif</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Tidak Aktif</Badge>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{bulanMohon}</TableCell>
                          <TableCell className="whitespace-nowrap">{tahunMohon}</TableCell>
                          <TableCell className="min-w-[200px] uppercase">{app.pemohon.name}</TableCell>
                          <TableCell className="whitespace-nowrap font-mono text-sm">{formatIC(app.pemohon.ic)}</TableCell>
                        </TableRow>
                        );
                      })
                    )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination Controls */}
              {!loading && filteredApps.length > 0 && (
                <div className="hidden md:flex items-center justify-between px-4 py-4 border-t">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      {language === 'en' 
                        ? `Showing ${startIndex + 1}-${Math.min(endIndex, filteredApps.length)} of ${filteredApps.length} records`
                        : `Memaparkan ${startIndex + 1}-${Math.min(endIndex, filteredApps.length)} daripada ${filteredApps.length} rekod`}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {language === 'en' ? 'Items per page:' : 'Item setiap halaman:'}
                      </span>
                      <Select 
                        value={itemsPerPage.toString()} 
                        onValueChange={(value) => {
                          setItemsPerPage(parseInt(value));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="w-[80px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      {language === 'en' ? 'Previous' : 'Sebelum'}
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <>
                          <span className="px-2">...</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(totalPages)}
                            className="w-8 h-8 p-0"
                          >
                            {totalPages}
                          </Button>
                        </>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      {language === 'en' ? 'Next' : 'Seterusnya'}
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Mobile Pagination */}
              {!loading && filteredApps.length > 0 && (
                <div className="md:hidden px-4 py-4 border-t space-y-3">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="flex-1"
                    >
                      ← {language === 'en' ? 'Previous' : 'Sebelumnya'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="flex-1"
                    >
                      {language === 'en' ? 'Next' : 'Seterusnya'} →
                    </Button>
                  </div>
                  <div className="text-center text-xs text-muted-foreground">
                    {language === 'en' 
                      ? `Page ${currentPage} of ${totalPages} • ${filteredApps.length} records`
                      : `Halaman ${currentPage}/${totalPages} • ${filteredApps.length} rekod`}
                  </div>
                </div>
              )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Serial Number Configuration Management */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{language === 'en' ? 'Serial Number Configuration' : 'Urusan Siri Nombor Mengikut Sesi'}</CardTitle>
              <CardDescription>
                {language === 'en'
                  ? 'Configure serial number prefix, year, and capacity. Format: PREFIX/YEAR/NUMBER'
                  : 'Konfigurasi awalan siri nombor, tahun, dan kapasiti. Format: AWALAN/TAHUN/NOMBOR'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                <div>
                  <Label className="mb-2 block">{language === 'en' ? 'Prefix' : 'Awalan'}</Label>
                  <Input
                    value={serialPrefix}
                    onChange={(e) => setSerialPrefix(e.target.value.toUpperCase())}
                    placeholder="MPHS"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">{language === 'en' ? 'Year' : 'Tahun'}</Label>
                  <Input
                    value={serialYear}
                    onChange={(e) => setSerialYear(e.target.value)}
                    placeholder="2025"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">{language === 'en' ? 'Issued' : 'Telah Dikeluarkan'}</Label>
                  <Input value={issuedCount} disabled className="h-9 bg-muted" />
                </div>
                <div>
                  <Label className="mb-2 block">{language === 'en' ? 'Capacity (Max)' : 'Kapasiti (Maks)'}</Label>
                  <Input
                    type="number"
                    value={capacityInput}
                    onChange={(e) => setCapacityInput(e.target.value)}
                    min={issuedCount}
                    className="h-9"
                  />
                </div>
                <div>
                  <Button
                    disabled={sessionLoading || !capacityInput || isNaN(parseInt(capacityInput)) || parseInt(capacityInput) < issuedCount || !serialPrefix.trim()}
                    onClick={async () => {
                      try {
                        setSessionLoading(true);
                        const nextCap = parseInt(capacityInput);
                        const yearToUse = parseInt(serialYear) || currentYear;
                        // Save both capacity and prefix
                        await setSessionConfig(yearToUse, nextCap, serialPrefix);
                        const [cap, issued, prefix] = await Promise.all([
                          getSessionCapacity(yearToUse),
                          getIssuedCount(yearToUse),
                          getSessionPrefix(yearToUse),
                        ]);
                        setSessionCapacityState(cap);
                        setIssuedCountState(issued);
                        setCapacityInput(String(cap));
                        setSerialPrefix(prefix);
                        toast.success(language === 'en' ? 'Configuration updated' : 'Konfigurasi dikemaskini');
                      } catch (e: any) {
                        toast.error(e.message || (language === 'en' ? 'Failed to update' : 'Gagal kemaskini'));
                      } finally {
                        setSessionLoading(false);
                      }
                    }}
                    className="h-9 w-full"
                  >
                    {sessionLoading ? (language === 'en' ? 'Saving...' : 'Menyimpan...') : (language === 'en' ? 'Update Configuration' : 'Kemaskini Kapasiti')}
                  </Button>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  {language === 'en' ? 'Example: Next serial number format' : 'Contoh: Format siri nombor'}
                </p>
                <p className="text-lg font-bold text-blue-900 font-mono mt-1">
                  {serialPrefix}/{serialYear}/0001
                </p>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                {language === 'en'
                  ? 'Note: Serial format will be PREFIX/YEAR/NUMBER (e.g., MPHS/2025/0001). Capacity is based on the year.'
                  : 'Nota: Format siri nombor adalah AWALAN/TAHUN/NOMBOR (cth: MPHS/2025/0001). Kapasiti berdasarkan tahun.'}
              </div>

              {/* KML Download Section - Integrated */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center gap-2 mb-4">
                  <Map className="h-5 w-5" />
                  <h3 className="font-semibold">{language === 'en' ? 'Download Interactive Map (KML)' : 'Muat Turun Peta Interaktif (KML)'}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {language === 'en' 
                    ? 'Download successful applications map data in KML format (same as dashboard interactive map)' 
                    : 'Muat turun data peta permohonan berjaya dalam format KML (sama seperti peta interaktif dashboard)'}
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <Label className="mb-1 block">{language === 'en' ? 'Session' : 'Sesi'}</Label>
                    <Select value={kmlSession} onValueChange={setKmlSession}>
                      <SelectTrigger className="h-9 w-full sm:w-55">
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

                  <Button onClick={handleKMLDownload} className="h-9 w-full sm:w-55">
                    <Download className="h-4 w-4 mr-2" />
                    {language === 'en' ? 'Download KML' : 'Muat Turun KML'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>


      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[98vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">Butiran Permohonan</DialogTitle>
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
                  {isAdminBoss && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteModal(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {language === 'en' ? 'Delete' : 'Padam'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-3 overflow-y-auto flex-1 px-6 py-4">
              {/* ROW 1: Maklumat Pemohon */}
              <div className="p-4 bg-white border-2 border-blue-200 rounded-lg shadow-sm">
                <h3 className="text-base font-semibold text-blue-900 mb-3 pb-2 border-b border-blue-300 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Maklumat Pemohon
                </h3>
                
                {selectedApp.no_siri && (
                  <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-xs font-medium text-blue-700">No. Siri</p>
                    <p className="text-sm font-semibold text-blue-900 font-mono">{selectedApp.no_siri}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-blue-700 font-medium">Nama:</span> {selectedApp.pemohon.name}</div>
                  <div><span className="text-blue-700 font-medium">IC:</span> <span className="font-mono">{formatIC(selectedApp.pemohon.ic)}</span></div>
                  <div><span className="text-blue-700 font-medium">Kad OKU:</span> {selectedApp.pemohon.okuCard}</div>
                  <div><span className="text-blue-700 font-medium">Telefon:</span> {selectedApp.pemohon.phone}</div>
                  <div><span className="text-blue-700 font-medium">No. Kereta:</span> {selectedApp.pemohon.carReg}</div>
                  <div><span className="text-blue-700 font-medium">No. Akaun Cukai:</span> {selectedApp.pemohon.taxAccount || '-'}</div>
                  <div><span className="text-blue-700 font-medium">Kategori:</span> {selectedApp.pemohon.okuCategory}</div>
                  <div className="col-span-2"><span className="text-blue-700 font-medium">Alamat:</span> {typeof selectedApp.pemohon.address === 'object' ? selectedApp.pemohon.address.full_address || `${selectedApp.pemohon.address.street}, ${selectedApp.pemohon.address.mukim}, ${selectedApp.pemohon.address.daerah}` : selectedApp.pemohon.address}</div>
                </div>
                
                {selectedApp.tanggungan && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <h4 className="font-semibold mb-2 text-blue-900">Maklumat Tanggungan</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Nama Penjaga:</span> {selectedApp.tanggungan.name}</div>
                    <div><span className="text-muted-foreground">Hubungan:</span> {selectedApp.tanggungan.relation}</div>
                    <div><span className="text-muted-foreground">IC Penjaga:</span> {selectedApp.tanggungan.ic}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* ROW 2: Status & Expiry */}
              <div className="p-4 bg-white border-2 border-green-200 rounded-lg shadow-sm">
                <h3 className="text-base font-semibold text-green-900 mb-3 pb-2 border-b border-green-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Status Permohonan
                </h3>
                
                {/* Expiry Date Display */}
                {(selectedApp.status === 'Diluluskan' || selectedApp.status === 'Sedia Diambil' || selectedApp.status === 'Telah Diambil') && selectedApp.expiry_date && (
                  <div className={`p-2 rounded mb-3 border-2 ${
                    new Date(selectedApp.expiry_date) < new Date()
                      ? 'bg-white border-red-300'
                      : 'bg-white border-green-300'
                  }`}>
                    <p className={`text-xs font-medium mb-1 ${
                      new Date(selectedApp.expiry_date) < new Date() ? 'text-red-700' : 'text-green-700'
                    }`}>
                      {new Date(selectedApp.expiry_date) < new Date() ? '⚠️ Tamat Tempoh' : '✓ Tarikh Tamat Tempoh'}
                    </p>
                    <p className={`text-sm font-semibold font-mono ${
                      new Date(selectedApp.expiry_date) < new Date() ? 'text-red-600' : 'text-green-900'
                    }`}>
                      {new Date(selectedApp.expiry_date).toLocaleDateString('ms-MY')}
                    </p>
                    {new Date(selectedApp.expiry_date) < new Date() && (
                      <p className="text-xs text-red-600 mt-1">Pembaharuan diperlukan</p>
                    )}
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-green-700 font-medium">Status:</span> <span className="font-semibold text-green-900">{selectedApp.status}</span></div>
                  <div><span className="text-green-700 font-medium">Jenis:</span> {selectedApp.application_type === 'baru' ? 'Baharu' : 'Pembaharuan'}</div>
                  <div><span className="text-green-700 font-medium">Tarikh Mohon:</span> {new Date(selectedApp.submitted_date).toLocaleDateString('ms-MY')}</div>
                  {selectedApp.approved_date && (
                    <div><span className="text-green-700 font-medium">Tarikh Lulus:</span> {new Date(selectedApp.approved_date).toLocaleDateString('ms-MY')}</div>
                  )}
                </div>
                
                {selectedApp.admin_notes && (
                  <div className="mt-3 p-2 bg-red-50 border-l-4 border-l-red-500 rounded flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-red-800 text-xs mb-1">Catatan Admin</h4>
                      <p className="text-xs text-red-700">{selectedApp.admin_notes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* ROW 3: Dokumen */}
              {selectedApp.documents && (
                <div className="p-4 bg-white border-2 border-orange-200 rounded-lg shadow-sm">
                  <h3 className="text-base font-semibold text-orange-900 mb-3 pb-2 border-b border-orange-300 flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Dokumen Yang Dimuat Naik
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedApp.documents.icCopy && (
                      <a 
                        href={selectedApp.documents.icCopy} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-3 bg-white border-2 border-orange-200 rounded hover:bg-orange-50 hover:border-orange-400 transition-colors flex items-center gap-2"
                      >
                        <div className="p-2 bg-green-100 rounded">
                          <FileText className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="text-xs">
                          <p className="font-semibold text-gray-900">Salinan IC</p>
                          <p className="text-green-600">✓ Dimuat naik</p>
                        </div>
                      </a>
                    )}
                    
                    {selectedApp.documents.okuCard && (
                      <a 
                        href={selectedApp.documents.okuCard} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-3 bg-white border-2 border-orange-200 rounded hover:bg-orange-50 hover:border-orange-400 transition-colors flex items-center gap-2"
                      >
                        <div className="p-2 bg-green-100 rounded">
                          <FileText className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="text-xs">
                          <p className="font-semibold text-gray-900">Kad OKU</p>
                          <p className="text-green-600">✓ Dimuat naik</p>
                        </div>
                      </a>
                    )}
                    
                    {selectedApp.documents.drivingLicense && (
                      <a 
                        href={selectedApp.documents.drivingLicense} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-3 bg-white border-2 border-orange-200 rounded hover:bg-orange-50 hover:border-orange-400 transition-colors flex items-center gap-2"
                      >
                        <div className="p-2 bg-green-100 rounded">
                          <FileText className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="text-xs">
                          <p className="font-semibold text-gray-900">Lesen Memandu</p>
                          <p className="text-green-600">✓ Dimuat naik</p>
                        </div>
                      </a>
                    )}
                    
                    {selectedApp.documents.passportPhoto && (
                      <a 
                        href={selectedApp.documents.passportPhoto} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-3 bg-white border-2 border-orange-200 rounded hover:bg-orange-50 hover:border-orange-400 transition-colors flex items-center gap-2"
                      >
                        <div className="p-2 bg-green-100 rounded">
                          <ImageIcon className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="text-xs">
                          <p className="font-semibold text-gray-900">Gambar Passport</p>
                          <p className="text-green-600">✓ Dimuat naik</p>
                        </div>
                      </a>
                    )}
                    
                    {selectedApp.documents.tanggunganSignature && (
                      <a 
                        href={selectedApp.documents.tanggunganSignature} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-3 bg-white border-2 border-orange-200 rounded hover:bg-orange-50 hover:border-orange-400 transition-colors flex items-center gap-2"
                      >
                        <div className="p-2 bg-green-100 rounded">
                          <FileText className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="text-xs">
                          <p className="font-semibold text-gray-900">Tandatangan</p>
                          <p className="text-green-600">✓ Dimuat naik</p>
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
                <p className="text-sm text-blue-700">No. Id: <span className="font-semibold">{generateNoId(selectedApp)}</span></p>
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
                <p className="text-sm text-red-700">No. Id: <span className="font-semibold">{generateNoId(selectedApp)}</span></p>
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
        <DialogContent className="max-w-[90vw] w-[90vw] h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{language === 'en' ? 'Edit Application Details' : 'Kemaskini Butiran Permohonan'}</DialogTitle>
          </DialogHeader>
          
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 py-4 border-b">
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${editStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                1
              </div>
              <span className={`text-sm font-medium ${editStep >= 1 ? 'text-blue-900' : 'text-gray-500'}`}>
                {language === 'en' ? 'Applicant Info' : 'Maklumat Pemohon'}
              </span>
            </div>
            
            <div className={`w-16 h-1 mx-2 rounded ${editStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${editStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                2
              </div>
              <span className={`text-sm font-medium ${editStep >= 2 ? 'text-blue-900' : 'text-gray-500'}`}>
                {language === 'en' ? 'Location & Map' : 'Lokasi & Peta'}
              </span>
            </div>
            
            <div className={`w-16 h-1 mx-2 rounded ${editStep >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${editStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                3
              </div>
              <span className={`text-sm font-medium ${editStep >= 3 ? 'text-blue-900' : 'text-gray-500'}`}>
                {language === 'en' ? 'Documents' : 'Dokumen'}
              </span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* STEP 1: Applicant Information */}
            {editStep === 1 && (
            <div className="p-4 bg-white border-2 border-blue-200 rounded-lg shadow-sm">
              <h4 className="text-base font-semibold text-blue-900 mb-3 pb-2 border-b border-blue-300 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {language === 'en' ? 'Applicant Information' : 'Maklumat Pemohon'}
              </h4>
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
                  <Label htmlFor="edit-street">{language === 'en' ? 'Street Address' : 'Alamat Jalan'} *</Label>
                  <Input
                    id="edit-street"
                    value={editFormData.street}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, street: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            )}

            {/* STEP 2: Location Map */}
            {editStep === 2 && (
            <div className="p-4 bg-white border-2 border-green-200 rounded-lg shadow-sm">
              <h4 className="text-base font-semibold text-green-900 mb-3 pb-2 border-b border-green-300 flex items-center gap-2">
                <Map className="w-4 h-4" />
                {language === 'en' ? 'Location on Map' : 'Lokasi Pada Peta'}
              </h4>
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
            )}

            {/* STEP 3: Document Upload Section */}
            {editStep === 3 && (
            <div className="p-4 bg-white border-2 border-orange-200 rounded-lg shadow-sm">
              <h4 className="text-base font-semibold text-orange-900 mb-3 pb-2 border-b border-orange-300 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                {language === 'en' ? 'Documents' : 'Dokumen'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* IC Copy */}
                <div>
                  <Label htmlFor="edit-icCopy">{language === 'en' ? 'IC Copy' : 'Salinan Kad Pengenalan'}</Label>
                  {currentDocUrls.icCopy && (
                    <div className="mt-2 mb-2">
                      <a href={currentDocUrls.icCopy} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                        <ImageIcon className="w-4 h-4" />
                        {language === 'en' ? 'View Current' : 'Lihat Semasa'}
                      </a>
                    </div>
                  )}
                  <Input
                    id="edit-icCopy"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setEditDocuments(prev => ({ ...prev, icCopy: e.target.files![0] }));
                      }
                    }}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'en' ? 'Leave empty to keep current document' : 'Biarkan kosong untuk kekalkan dokumen semasa'}
                  </p>
                </div>

                {/* OKU Card */}
                <div>
                  <Label htmlFor="edit-okuCardDoc">{language === 'en' ? 'OKU Card' : 'Kad OKU'}</Label>
                  {currentDocUrls.okuCard && (
                    <div className="mt-2 mb-2">
                      <a href={currentDocUrls.okuCard} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                        <ImageIcon className="w-4 h-4" />
                        {language === 'en' ? 'View Current' : 'Lihat Semasa'}
                      </a>
                    </div>
                  )}
                  <Input
                    id="edit-okuCardDoc"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setEditDocuments(prev => ({ ...prev, okuCard: e.target.files![0] }));
                      }
                    }}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'en' ? 'Leave empty to keep current document' : 'Biarkan kosong untuk kekalkan dokumen semasa'}
                  </p>
                </div>

                {/* Driving License */}
                <div>
                  <Label htmlFor="edit-drivingLicense">{language === 'en' ? 'Driving License' : 'Lesen Memandu'}</Label>
                  {currentDocUrls.drivingLicense && (
                    <div className="mt-2 mb-2">
                      <a href={currentDocUrls.drivingLicense} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                        <ImageIcon className="w-4 h-4" />
                        {language === 'en' ? 'View Current' : 'Lihat Semasa'}
                      </a>
                    </div>
                  )}
                  <Input
                    id="edit-drivingLicense"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setEditDocuments(prev => ({ ...prev, drivingLicense: e.target.files![0] }));
                      }
                    }}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'en' ? 'Leave empty to keep current document' : 'Biarkan kosong untuk kekalkan dokumen semasa'}
                  </p>
                </div>

                {/* Passport Photo */}
                <div>
                  <Label htmlFor="edit-passportPhoto">{language === 'en' ? 'Passport Photo' : 'Gambar Pasport'}</Label>
                  {currentDocUrls.passportPhoto && (
                    <div className="mt-2 mb-2">
                      <a href={currentDocUrls.passportPhoto} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                        <ImageIcon className="w-4 h-4" />
                        {language === 'en' ? 'View Current' : 'Lihat Semasa'}
                      </a>
                    </div>
                  )}
                  <Input
                    id="edit-passportPhoto"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setEditDocuments(prev => ({ ...prev, passportPhoto: e.target.files![0] }));
                      }
                    }}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'en' ? 'Leave empty to keep current document' : 'Biarkan kosong untuk kekalkan dokumen semasa'}
                  </p>
                </div>

                {/* Tanggungan Signature (if applicable) */}
                {currentDocUrls.tanggunganSignature && (
                  <div className="md:col-span-2">
                    <Label htmlFor="edit-tanggunganSignature">{language === 'en' ? 'Guardian Signature' : 'Tandatangan Tanggungan'}</Label>
                    <div className="mt-2 mb-2">
                      <a href={currentDocUrls.tanggunganSignature} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                        <ImageIcon className="w-4 h-4" />
                        {language === 'en' ? 'View Current' : 'Lihat Semasa'}
                      </a>
                    </div>
                    <Input
                      id="edit-tanggunganSignature"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setEditDocuments(prev => ({ ...prev, tanggunganSignature: e.target.files![0] }));
                        }
                      }}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {language === 'en' ? 'Leave empty to keep current document' : 'Biarkan kosong untuk kekalkan dokumen semasa'}
                    </p>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {editStep > 1 && (
              <Button variant="outline" onClick={() => setEditStep(editStep - 1)} disabled={isUpdating}>
                ← {language === 'en' ? 'Back' : 'Kembali'}
              </Button>
            )}
            {editStep < 3 ? (
              <Button onClick={() => setEditStep(editStep + 1)}>
                {language === 'en' ? 'Next' : 'Seterusnya'} →
              </Button>
            ) : (
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
            )}
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
                <span className="font-medium">{language === 'en' ? 'ID No:' : 'No. Id:'}</span> {generateNoId(selectedApp)}
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

      {/* Import CSV/Excel Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {language === 'en' ? 'Import CSV/Excel File' : 'Import Fail CSV/Excel'}
            </DialogTitle>
            <DialogDescription>
              {language === 'en' 
                ? 'Upload a CSV or Excel file to bulk import applications. All records will be treated as new applications (Pendaftaran Baru).'
                : 'Muat naik fail CSV atau Excel untuk import permohonan secara pukal. Semua rekod akan dianggap sebagai permohonan baharu (Pendaftaran Baru).'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div>
              <Label htmlFor="import-file" className="mb-2 block">
                {language === 'en' ? 'Select File' : 'Pilih Fail'}
              </Label>
              <Input
                id="import-file"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                disabled={isImporting}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {language === 'en' 
                  ? 'Supported formats: CSV, XLSX, XLS'
                  : 'Format yang disokong: CSV, XLSX, XLS'}
              </p>
            </div>

            {importFile && (
              <div className="p-3 bg-green-50 border border-green-200 rounded flex items-start gap-2">
                <div className="p-1.5 bg-green-100 rounded">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-green-900">
                    <span className="font-medium">{language === 'en' ? 'Selected file:' : 'Fail dipilih:'}</span> {importFile.name}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    {language === 'en' ? 'Size:' : 'Saiz:'} {(importFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
            )}

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 mb-1">
                    {language === 'en' ? 'Column Format' : 'Format Lajur'}
                  </h4>
                  <p className="text-xs text-blue-700">
                    {language === 'en' ? 'Follow exact order' : 'Ikut susunan tepat ini'}
                  </p>
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto mb-3 bg-white rounded p-3 border border-blue-200">
                <ol className="text-sm text-gray-700 space-y-1 ml-4 list-decimal">
                  <li>No. Siri</li>
                  <li>Jenis</li>
                  <li>No. IC</li>
                  <li>Nama</li>
                  <li>No. Kad OKU</li>
                  <li>No. Tel</li>
                  <li>No. Kereta</li>
                  <li>Kategori OKU</li>
                  <li>No. Akaun Cukai Taksiran</li>
                  <li>Alamat</li>
                  <li>Status</li>
                  <li>Tarikh Mohon</li>
                  <li>Tarikh Lulus</li>
                  <li>Tarikh Tamat Tempoh</li>
                  <li>Sesi</li>
                </ol>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  // Download template CSV
                  const link = document.createElement('a');
                  link.href = '/template-import-oku.csv';
                  link.download = 'template-import-oku.csv';
                  link.click();
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                {language === 'en' ? 'Download Template' : 'Muat Turun Templat'}
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowImportModal(false);
                setImportFile(null);
              }}
              disabled={isImporting}
            >
              {language === 'en' ? 'Cancel' : 'Batal'}
            </Button>
            <Button 
              onClick={handleBulkImport}
              disabled={isImporting || !importFile}
            >
              {isImporting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  {language === 'en' ? 'Importing...' : 'Mengimport...'}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {language === 'en' ? 'Import' : 'Import'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {language === 'en' ? 'Delete Applications' : 'Padam Permohonan'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {language === 'en' 
                ? `Are you sure you want to delete ${selectedRows.size} application${selectedRows.size > 1 ? 's' : ''}? This action cannot be undone.`
                : `Adakah anda pasti untuk memadam ${selectedRows.size} permohonan? Tindakan ini tidak boleh dibatalkan.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'en' ? 'Cancel' : 'Batal'}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBulkDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {language === 'en' ? 'Delete' : 'Padam'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </>
  );
}
