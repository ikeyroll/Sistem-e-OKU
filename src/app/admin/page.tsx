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
import { Search, Download, Eye, CheckCircle, XCircle, Calendar, FileText, Image as ImageIcon, Map, Edit, Save, X, Trash2, Upload, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { generateNoSiri } from '@/lib/generateNoSiri';
import { exportBySession } from '@/lib/csvExport';
import { useLanguage } from '@/contexts/LanguageContext';
import { getApplications, approveApplication as approveApp, rejectApplication as rejectApp, markAsReady, markAsCollected, updateApplication, deleteApplication, uploadFile, bulkImportApplications } from '@/lib/api/applications';
import { updateOkuCategoryFromSessionToLainLain } from '@/lib/api/updateOkuCategory';
import MapPicker from '@/components/MapPicker';
import { getIssuedCount, getSessionCapacity, setSessionCapacity, getSessionPrefix, setSessionConfig } from '@/lib/api/session';
import type { Application } from '@/lib/supabase';
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
  
  // Edit modal step state (3-page wizard)
  const [editStep, setEditStep] = useState<1 | 2 | 3>(1);
  
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
  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) {
      toast.error(language === 'en' ? 'Please select applications to delete' : 'Sila pilih permohonan untuk dipadam');
      return;
    }
    
    if (!confirm(`${language === 'en' ? 'Delete' : 'Padam'} ${selectedRows.size} ${language === 'en' ? 'applications?' : 'permohonan?'}`)) {
      return;
    }
    
    try {
      for (const id of selectedRows) {
        await deleteApplication(id);
      }
      
      setApplications(prev => prev.filter(app => !selectedRows.has(app.id)));
      setSelectedRows(new Set());
      toast.success(`${selectedRows.size} ${language === 'en' ? 'applications deleted' : 'permohonan dipadam'}`);
    } catch (error: any) {
      console.error('Error deleting applications:', error);
      toast.error(error.message || (language === 'en' ? 'Error deleting applications' : 'Ralat semasa memadam permohonan'));
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
      `No. Id: ${app.ref_no}\nNo. Siri: ${app.no_siri || '-'}\nNama: ${app.pemohon.name}\nNo. IC: ${formatIC(app.pemohon.ic)}\nJenis: ${app.application_type === 'baru' ? 'Baharu' : 'Pembaharuan'}\nStatus: ${app.status}`
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

  // Handle KML download - Use filteredApps with session filter
  const handleKMLDownload = async () => {
    try {
      const { generateKML } = await import('@/lib/kml');
      
      // Use filteredApps (respects all current filters) and apply session filter
      let kmlApps = filteredApps.filter(app => {
        // Only include apps with coordinates
        if (!app.latitude || !app.longitude) return false;
        
        // IMPORTANT: Only include successful applications (Diluluskan, Sedia Diambil, Telah Diambil)
        if (!isSuccessStatus(app.status)) return false;
        
        // Apply session filter
        if (kmlSession !== 'all') {
          if (app.approved_date) {
            const year = new Date(app.approved_date).getFullYear();
            const appSession = `${year}/${year + 2}`;
            if (appSession !== kmlSession) return false;
          } else {
            return false;
          }
        }
        
        return true;
      });

      if (kmlApps.length === 0) {
        toast.error('Tiada data untuk dimuat turun');
        return;
      }

      const kmlContent = generateKML(kmlApps);
      const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Generate filename
      let filename = 'peta-interaktif';
      if (kmlSession !== 'all') filename += `-${kmlSession.replace('/', '-')}`;
      filename += '.kml';
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`KML dimuat turun: ${kmlApps.length} lokasi`);
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
          <div className="space-y-1.5">
            <p className="font-bold text-sm">Format Tidak Lengkap</p>
            <p className="text-xs">Lajur hilang: <span className="font-semibold">{missingColumns.join(', ')}</span></p>
            <p className="text-[10px] text-muted-foreground">Muat turun templat untuk format betul.</p>
          </div>,
          { 
            duration: 6000,
            closeButton: true,
            dismissible: true
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
      
      // Show results with detailed error messages
      if (results.success > 0) {
        toast.success(`${language === 'en' ? 'Successfully imported' : 'Berjaya diimport'}: ${results.success} ${language === 'en' ? 'records' : 'rekod'}`);
      }
      
      if (results.failed > 0) {
        // Create detailed error message with line-by-line breakdown
        const errorDetails = results.errors.map((err: any) => {
          const rowData = err.data || {};
          const nama = rowData['Nama'] || rowData['nama'] || rowData['NAMA'] || 'N/A';
          const ic = rowData['No. IC'] || rowData['no. ic'] || rowData['NO. IC'] || 'N/A';
          return `Baris ${err.row}: ${nama} (IC: ${ic}) - ${err.error}`;
        }).join('\n');
        
        toast.error(
          <div className="space-y-2 max-w-md">
            <p className="font-bold text-sm">Gagal Import: {results.failed} rekod</p>
            <div className="max-h-32 overflow-y-auto text-xs space-y-1">
              {results.errors.slice(0, 5).map((err: any, idx: number) => {
                const nama = err.data?.['Nama'] || err.data?.['nama'] || 'N/A';
                const ic = err.data?.['No. IC'] || err.data?.['No IC'] || err.data?.['ic'] || 'N/A';
                return (
                  <div key={idx} className="p-1.5 bg-red-50 rounded text-red-800">
                    Baris {err.row}: {nama} (IC: {ic}) - {err.error}
                  </div>
                );
              })}
              {results.errors.length > 5 && (
                <p className="text-muted-foreground text-center">...dan {results.errors.length - 5} lagi</p>
              )}
            </div>
          </div>,
          {
            duration: 8000,
            closeButton: true,
            dismissible: true
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
    const matchesSearch =
      app.ref_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
    setEditStep(1); // Reset to step 1
    
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

      // Upload new documents if they were changed
      if (editDocuments.icCopy) {
        toast.info(language === 'en' ? 'Uploading IC copy...' : 'Memuat naik salinan IC...');
        uploadedDocs.icCopy = await uploadFile(editDocuments.icCopy, `${selectedApp.ref_no}/ic-copy`);
      }
      if (editDocuments.okuCard) {
        toast.info(language === 'en' ? 'Uploading OKU card...' : 'Memuat naik kad OKU...');
        uploadedDocs.okuCard = await uploadFile(editDocuments.okuCard, `${selectedApp.ref_no}/oku-card`);
      }
      if (editDocuments.drivingLicense) {
        toast.info(language === 'en' ? 'Uploading driving license...' : 'Memuat naik lesen memandu...');
        uploadedDocs.drivingLicense = await uploadFile(editDocuments.drivingLicense, `${selectedApp.ref_no}/license`);
      }
      if (editDocuments.passportPhoto) {
        toast.info(language === 'en' ? 'Uploading passport photo...' : 'Memuat naik gambar pasport...');
        uploadedDocs.passportPhoto = await uploadFile(editDocuments.passportPhoto, `${selectedApp.ref_no}/photo`);
      }
      if (editDocuments.tanggunganSignature) {
        toast.info(language === 'en' ? 'Uploading guardian signature...' : 'Memuat naik tandatangan tanggungan...');
        uploadedDocs.tanggunganSignature = await uploadFile(editDocuments.tanggunganSignature, `${selectedApp.ref_no}/tanggungan-signature`);
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
            <div className="flex gap-2">
              {isAdminBoss && (
                <>
                  <Button variant="outline" onClick={() => router.push('/admin/manage-admins')} style={{width: '200px'}}>
                    {language === 'en' ? 'Manage Admins' : 'Urus Admin'}
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/admin/manage-footer')} style={{width: '200px'}}>
                    {language === 'en' ? 'Footer' : 'Footer'}
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={handleLogout} style={{width: '200px'}}>
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
                <Label className="mb-2 block">{language === 'en' ? 'Search (No. Ref, No. Siri, IC, Name)' : 'Cari (No Rujukan, No Siri, IC, Nama)'}</Label>
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
              
              {/* Tapisan Section */}
              <div>
                <Label className="mb-2 block font-semibold">{language === 'en' ? 'Filters' : 'Tapisan'}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                  {/* Permohonan */}
                  <div>
                    <Label className="mb-2 block">{language === 'en' ? 'Application' : 'Permohonan'}</Label>
                    <Select value={permohonanFilter} onValueChange={setPermohonanFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{language === 'en' ? 'All' : 'Semua'}</SelectItem>
                        <SelectItem value="Baharu">{language === 'en' ? 'New' : 'Baharu'}</SelectItem>
                        <SelectItem value="Pembaharuan">{language === 'en' ? 'Renewal' : 'Pembaharuan'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Peringkat */}
                  <div>
                    <Label className="mb-2 block">{language === 'en' ? 'Stage' : 'Peringkat'}</Label>
                    <Select value={peringkatFilter} onValueChange={setPeringkatFilter}>
                      <SelectTrigger>
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
                      <SelectTrigger>
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
                      <SelectTrigger>
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
                      <SelectTrigger>
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
                    variant="outline" 
                    onClick={() => setShowImportModal(true)}
                    className="gap-2"
                    style={{width: '200px'}}
                  >
                    <Upload className="w-4 h-4" />
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
                    <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {selectedRows.size} {language === 'en' ? 'selected' : 'dipilih'}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleBulkCopy}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          style={{width: '200px'}}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          {language === 'en' ? 'Copy' : 'Salin'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleBulkDelete}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          style={{width: '200px'}}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {language === 'en' ? 'Delete' : 'Padam'}
                        </Button>
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
                          <TableCell className="font-medium whitespace-nowrap font-mono">{app.ref_no}</TableCell>
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
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              )}
                              {app.status === 'Sedia Diambil' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-purple-600 hover:text-purple-700"
                                  onClick={() => handleMarkCollected(app.id)}
                                >
                                  <CheckCircle className="w-4 h-4" />
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
                          <TableCell className="min-w-[200px]">{app.pemohon.name}</TableCell>
                          <TableCell className="whitespace-nowrap font-mono text-sm">{formatIC(app.pemohon.ic)}</TableCell>
                        </TableRow>
                        );
                      })
                    )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination Controls - Mobile Responsive */}
              {!loading && filteredApps.length > 0 && (
                <div className="px-4 py-4 border-t">
                  {/* Desktop View */}
                  <div className="hidden md:flex items-center justify-between">
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
                  
                  {/* Mobile View - Large Buttons */}
                  <div className="md:hidden space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="flex-1"
                      >
                        ◀ {language === 'en' ? 'Previous' : 'Sebelumnya'}
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="flex-1"
                      >
                        {language === 'en' ? 'Next' : 'Seterusnya'} ▶
                      </Button>
                    </div>
                    <div className="text-center text-sm text-muted-foreground">
                      {language === 'en' 
                        ? `Page ${currentPage} of ${totalPages} • ${filteredApps.length} total records`
                        : `Halaman ${currentPage} daripada ${totalPages} • ${filteredApps.length} rekod`}
                    </div>
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
                  />
                </div>
                <div>
                  <Label className="mb-2 block">{language === 'en' ? 'Year' : 'Tahun'}</Label>
                  <Input
                    value={serialYear}
                    onChange={(e) => setSerialYear(e.target.value)}
                    placeholder="2025"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">{language === 'en' ? 'Issued' : 'Telah Dikeluarkan'}</Label>
                  <Input value={issuedCount} disabled className="bg-muted" />
                </div>
                <div>
                  <Label className="mb-2 block">{language === 'en' ? 'Capacity (Max)' : 'Kapasiti (Maks)'}</Label>
                  <Input
                    type="number"
                    value={capacityInput}
                    onChange={(e) => setCapacityInput(e.target.value)}
                    min={issuedCount}
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
                    className="w-full"
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
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
                    <Button onClick={handleKMLDownload} className="w-full h-9">
                      <Download className="h-4 w-4 mr-2" />
                      {language === 'en' ? 'Download KML' : 'Muat Turun KML'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>


      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-[90vw] w-[90vw] h-[95vh] overflow-hidden flex flex-col">
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
            <div className="flex-1 overflow-y-auto px-2">
              <div className="space-y-2 max-w-5xl mx-auto">
                {/* Row 1 - Applicant Info */}
                <div className="space-y-2">
                  {selectedApp.no_siri && (
                    <div className="p-2 bg-gradient-to-r from-green-50 to-green-100 border border-green-400 rounded">
                      <p className="text-[10px] font-semibold text-green-700">📋 NO. SIRI</p>
                      <p className="text-sm font-bold text-green-900 font-mono">{selectedApp.no_siri}</p>
                    </div>
                  )}
                  
                  <div className="p-2 bg-white border border-gray-200 rounded">
                    <h4 className="font-bold text-xs mb-1 pb-1 border-b border-blue-500 text-blue-900">👤 Maklumat Pemohon</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between items-center py-1 border-b">
                        <span className="text-gray-600 font-medium">Nama:</span>
                        <span className="font-bold text-gray-900">{selectedApp.pemohon.name}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b">
                        <span className="text-gray-600 font-medium">IC:</span>
                        <span className="font-mono font-bold text-gray-900">{formatIC(selectedApp.pemohon.ic)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b">
                        <span className="text-gray-600 font-medium">Kad OKU:</span>
                        <span className="font-bold text-gray-900">{selectedApp.pemohon.okuCard}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b">
                        <span className="text-gray-600 font-medium">Telefon:</span>
                        <span className="font-bold text-gray-900">{selectedApp.pemohon.phone}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b">
                        <span className="text-gray-600 font-medium">No. Kereta:</span>
                        <span className="font-bold text-gray-900">{selectedApp.pemohon.carReg}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b">
                        <span className="text-gray-600 font-medium">Cukai Taksiran:</span>
                        <span className="font-bold text-gray-900">{selectedApp.pemohon.taxAccount || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-gray-600 font-medium">Kategori OKU:</span>
                        <span className="font-bold text-blue-700">{selectedApp.pemohon.okuCategory}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-2 bg-white border border-gray-200 rounded">
                    <h4 className="font-bold text-xs mb-1 text-gray-700">📍 Alamat</h4>
                    <p className="text-xs leading-relaxed text-gray-900">{typeof selectedApp.pemohon.address === 'object' ? selectedApp.pemohon.address.full_address || `${selectedApp.pemohon.address.street}, ${selectedApp.pemohon.address.mukim}, ${selectedApp.pemohon.address.daerah}` : selectedApp.pemohon.address}</p>
                    <div className="mt-1 space-y-0.5">
                      {selectedApp.mukim && (
                        <p className="text-xs text-gray-600">Mukim: <span className="font-semibold">{selectedApp.mukim}</span></p>
                      )}
                      {selectedApp.daerah && (
                        <p className="text-xs text-gray-600">Daerah: <span className="font-semibold">{selectedApp.daerah}</span></p>
                      )}
                      {(selectedApp.latitude || selectedApp.longitude) && (
                        <p className="text-xs text-gray-600 font-mono">📍 {selectedApp.latitude?.toFixed(6)}, {selectedApp.longitude?.toFixed(6)}</p>
                      )}
                    </div>
                  </div>

                  {selectedApp.tanggungan && (
                    <div className="p-2 bg-blue-50 border border-blue-300 rounded">
                      <h4 className="font-bold text-xs mb-1 text-blue-900">👨‍👩‍👧 Maklumat Tanggungan</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-blue-700">Nama Penjaga:</span>
                          <span className="font-bold text-blue-900">{selectedApp.tanggungan.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Hubungan:</span>
                          <span className="font-bold text-blue-900">{selectedApp.tanggungan.relation}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">IC Penjaga:</span>
                          <span className="font-bold text-blue-900">{selectedApp.tanggungan.ic}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Row 2 - Status & Expiry */}
                <div className="space-y-2">

                  {/* Expiry Date Display - Compact like No Siri */}
                  {(selectedApp.status === 'Diluluskan' || selectedApp.status === 'Sedia Diambil' || selectedApp.status === 'Telah Diambil') && selectedApp.expiry_date && (
                    <div className={`p-2 border rounded ${
                      new Date(selectedApp.expiry_date) < new Date()
                        ? 'bg-gradient-to-r from-red-50 to-red-100 border-red-400'
                        : 'bg-gradient-to-r from-green-50 to-green-100 border-green-400'
                    }`}>
                      <p className={`text-[10px] font-semibold ${new Date(selectedApp.expiry_date) < new Date() ? 'text-red-700' : 'text-green-700'}`}>
                        {new Date(selectedApp.expiry_date) < new Date() ? '⚠️ TAMAT TEMPOH' : '📅 TARIKH TAMAT TEMPOH'}
                      </p>
                      <p className={`text-sm font-bold font-mono ${
                        new Date(selectedApp.expiry_date) < new Date() ? 'text-red-900' : 'text-green-900'
                      }`}>
                        {new Date(selectedApp.expiry_date).toLocaleDateString('ms-MY')}
                      </p>
                      {new Date(selectedApp.expiry_date) < new Date() && (
                        <p className="text-[10px] text-red-700 mt-0.5">Pembaharuan diperlukan</p>
                      )}
                    </div>
                  )}
                  
                  <div className="p-2 bg-white border border-gray-200 rounded">
                    <h4 className="font-bold text-xs mb-1 pb-1 border-b border-purple-500 text-purple-900">📊 Status Permohonan</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between items-center py-1 border-b">
                        <span className="text-gray-600 font-medium">Status:</span>
                        <span className="font-black text-xs text-purple-700">{selectedApp.status}</span>
                      </div>
                      {selectedApp.submitted_date && (
                        <div className="flex justify-between items-center py-1 border-b">
                          <span className="text-gray-600 font-medium">Tarikh Mohon:</span>
                          <span className="font-bold text-gray-900">{new Date(selectedApp.submitted_date).toLocaleDateString('ms-MY')}</span>
                        </div>
                      )}
                      {selectedApp.approved_date && (
                        <div className="flex justify-between items-center py-1 border-b">
                          <span className="text-gray-600 font-medium">Tarikh Lulus:</span>
                          <span className="font-bold text-gray-900">{new Date(selectedApp.approved_date).toLocaleDateString('ms-MY')}</span>
                        </div>
                      )}
                      {selectedApp.collected_date && (
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-600 font-medium">Tarikh Ambil:</span>
                          <span className="font-bold text-gray-900">{new Date(selectedApp.collected_date).toLocaleDateString('ms-MY')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {selectedApp.admin_notes && (
                    <div className="p-2 bg-red-50 border-l-4 border-l-red-600 rounded">
                      <h4 className="font-bold text-red-900 mb-1 flex items-center gap-2 text-xs">
                        <AlertCircle className="w-4 h-4" />
                        Catatan Admin
                      </h4>
                      <p className="text-xs text-red-800 leading-relaxed">{selectedApp.admin_notes}</p>
                    </div>
                  )}
                </div>
                
                {/* Row 3 - Documents */}
                <div className="space-y-2">

                  <div>
                    <h4 className="font-bold text-xs mb-1 pb-1 border-b border-orange-500 text-orange-900">📎 Dokumen Yang Dimuat Naik</h4>
                    {selectedApp.documents ? (
                      <div className="grid grid-cols-2 gap-2">
                        {selectedApp.documents.icCopy && (
                          <a 
                            href={selectedApp.documents.icCopy} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block p-2 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-lg hover:shadow-md transition-all duration-200"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="w-6 h-6 text-blue-600" />
                              <div>
                                <p className="font-bold text-blue-900 text-xs">Salinan IC</p>
                                <p className="text-[10px] text-blue-700">Klik lihat</p>
                              </div>
                            </div>
                          </a>
                        )}
                    
                        {selectedApp.documents.okuCard && (
                          <a 
                            href={selectedApp.documents.okuCard} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block p-2 bg-gradient-to-r from-green-50 to-green-100 border border-green-300 rounded-lg hover:shadow-md transition-all duration-200"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="w-6 h-6 text-green-600" />
                              <div>
                                <p className="font-bold text-green-900 text-xs">Kad OKU</p>
                                <p className="text-[10px] text-green-700">Klik lihat</p>
                              </div>
                            </div>
                          </a>
                        )}
                    
                        {selectedApp.documents.drivingLicense && (
                          <a 
                            href={selectedApp.documents.drivingLicense} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block p-2 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-300 rounded-lg hover:shadow-md transition-all duration-200"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="w-6 h-6 text-purple-600" />
                              <div>
                                <p className="font-bold text-purple-900 text-xs">Lesen Memandu</p>
                                <p className="text-[10px] text-purple-700">Klik lihat</p>
                              </div>
                            </div>
                          </a>
                        )}
                    
                        {selectedApp.documents.passportPhoto && (
                          <a 
                            href={selectedApp.documents.passportPhoto} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block p-2 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-300 rounded-lg hover:shadow-md transition-all duration-200"
                          >
                            <div className="flex items-center gap-2">
                              <ImageIcon className="w-6 h-6 text-orange-600" />
                              <div>
                                <p className="font-bold text-orange-900 text-xs">Gambar Passport</p>
                                <p className="text-[10px] text-orange-700">Klik lihat</p>
                              </div>
                            </div>
                          </a>
                        )}
                    
                        {selectedApp.documents.tanggunganSignature && (
                          <a 
                            href={selectedApp.documents.tanggunganSignature} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block p-2 bg-gradient-to-r from-red-50 to-red-100 border border-red-300 rounded-lg hover:shadow-md transition-all duration-200"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="w-6 h-6 text-red-600" />
                              <div>
                                <p className="font-bold text-red-900 text-xs">Tandatangan</p>
                                <p className="text-[10px] text-red-700">Klik lihat</p>
                              </div>
                            </div>
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 text-center py-4">Tiada dokumen dimuat naik</p>
                    )}
                  </div>
                </div>
              </div>
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

      {/* Edit Modal - 3 Page Wizard */}
      <Dialog open={showEditModal} onOpenChange={(open) => {
        setShowEditModal(open);
        if (!open) setEditStep(1); // Reset to step 1 when closing
      }}>
        <DialogContent className="max-w-[90vw] w-[90vw] h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl">{language === 'en' ? 'Edit Application Details' : 'Kemaskini Butiran Permohonan'}</DialogTitle>
            
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 mt-4 pb-3 border-b">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded ${editStep === 1 ? 'bg-blue-100 text-blue-900 font-bold' : 'bg-gray-100 text-gray-600'}`}>
                <span className="text-xs">1. Maklumat Pemohon</span>
              </div>
              <span className="text-gray-400">→</span>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded ${editStep === 2 ? 'bg-blue-100 text-blue-900 font-bold' : 'bg-gray-100 text-gray-600'}`}>
                <span className="text-xs">2. Lokasi & Peta</span>
              </div>
              <span className="text-gray-400">→</span>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded ${editStep === 3 ? 'bg-blue-100 text-blue-900 font-bold' : 'bg-gray-100 text-gray-600'}`}>
                <span className="text-xs">3. Dokumen</span>
              </div>
            </div>
          </DialogHeader>
          
          {/* Step Content */}
          <div className="flex-1 overflow-y-auto px-2">
            <div className="space-y-2 max-w-5xl mx-auto">
              
              {/* STEP 1: Maklumat Pemohon */}
              {editStep === 1 && (
                <div className="p-2 bg-white border border-gray-200 rounded">
                  <h4 className="font-bold text-xs mb-2 pb-1 border-b border-blue-500 text-blue-900">👤 Maklumat Pemohon</h4>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <Label htmlFor="edit-name" className="text-xs">{language === 'en' ? 'Name' : 'Nama'} *</Label>
                      <Input
                        id="edit-name"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="text-xs h-8"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-ic" className="text-xs">{language === 'en' ? 'IC Number' : 'No. IC'} *</Label>
                      <Input id="edit-ic" value={editFormData.ic} onChange={(e) => setEditFormData(prev => ({ ...prev, ic: e.target.value }))} className="text-xs h-8" />
                    </div>
                    <div>
                      <Label htmlFor="edit-okuCard" className="text-xs">{language === 'en' ? 'OKU Card' : 'Kad OKU'} *</Label>
                      <Input id="edit-okuCard" value={editFormData.okuCard} onChange={(e) => setEditFormData(prev => ({ ...prev, okuCard: e.target.value }))} className="text-xs h-8" />
                    </div>
                    <div>
                      <Label htmlFor="edit-phone" className="text-xs">{language === 'en' ? 'Phone' : 'Telefon'} *</Label>
                      <Input id="edit-phone" value={editFormData.phone} onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))} className="text-xs h-8" />
                    </div>
                    <div>
                      <Label htmlFor="edit-carReg" className="text-xs">{language === 'en' ? 'Car Reg' : 'No. Kereta'} *</Label>
                      <Input id="edit-carReg" value={editFormData.carReg} onChange={(e) => setEditFormData(prev => ({ ...prev, carReg: e.target.value }))} className="text-xs h-8" />
                    </div>
                    <div>
                      <Label htmlFor="edit-taxAccount" className="text-xs">{language === 'en' ? 'Tax Account' : 'Cukai Taksiran'}</Label>
                      <Input id="edit-taxAccount" value={editFormData.taxAccount} onChange={(e) => setEditFormData(prev => ({ ...prev, taxAccount: e.target.value }))} className="text-xs h-8" />
                    </div>
                    <div>
                      <Label htmlFor="edit-okuCategory" className="text-xs">{language === 'en' ? 'OKU Category' : 'Kategori OKU'} *</Label>
                      <Input id="edit-okuCategory" value={editFormData.okuCategory} onChange={(e) => setEditFormData(prev => ({ ...prev, okuCategory: e.target.value }))} className="text-xs h-8" />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="edit-street" className="text-xs">{language === 'en' ? 'Address' : 'Alamat'} *</Label>
                      <Input id="edit-street" value={editFormData.street} onChange={(e) => setEditFormData(prev => ({ ...prev, street: e.target.value }))} className="text-xs h-8" />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Lokasi & Peta */}
              {editStep === 2 && (
                <div className="p-2 bg-white border border-gray-200 rounded">
                  <h4 className="font-bold text-xs mb-2 pb-1 border-b border-blue-500 text-blue-900">📍 Lokasi & Peta</h4>
                  <div className="grid grid-cols-2 gap-3 mt-2 mb-3">
                    <div>
                      <Label className="text-xs">{language === 'en' ? 'Latitude' : 'Latitud'}</Label>
                      <Input value={editLatitude?.toFixed(6) || ''} disabled className="bg-muted text-xs h-8" />
                    </div>
                    <div>
                      <Label className="text-xs">{language === 'en' ? 'Longitude' : 'Longitud'}</Label>
                      <Input value={editLongitude?.toFixed(6) || ''} disabled className="bg-muted text-xs h-8" />
                    </div>
                    <div>
                      <Label className="text-xs">Mukim</Label>
                      <Input value={editMukim} disabled className="bg-muted text-xs h-8" />
                    </div>
                    <div>
                      <Label className="text-xs">Daerah</Label>
                      <Input value={editDaerah} disabled className="bg-muted text-xs h-8" />
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

              {/* STEP 3: Dokumen */}
              {editStep === 3 && (
                <div className="p-2 bg-white border border-gray-200 rounded">
                  <h4 className="font-bold text-xs mb-2 pb-1 border-b border-blue-500 text-blue-900">📎 Dokumen Sokongan</h4>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <Label htmlFor="edit-icCopy" className="text-xs">{language === 'en' ? 'IC Copy' : 'Salinan IC'}</Label>
                      {currentDocUrls.icCopy && <a href={currentDocUrls.icCopy} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline block mt-1">Lihat Semasa</a>}
                      <Input id="edit-icCopy" type="file" accept="image/*,.pdf" onChange={(e) => { if (e.target.files?.[0]) setEditDocuments(prev => ({ ...prev, icCopy: e.target.files![0] })); }} className="mt-1 text-xs h-8" />
                    </div>
                    <div>
                      <Label htmlFor="edit-okuCardDoc" className="text-xs">{language === 'en' ? 'OKU Card' : 'Kad OKU'}</Label>
                      {currentDocUrls.okuCard && <a href={currentDocUrls.okuCard} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline block mt-1">Lihat Semasa</a>}
                      <Input id="edit-okuCardDoc" type="file" accept="image/*,.pdf" onChange={(e) => { if (e.target.files?.[0]) setEditDocuments(prev => ({ ...prev, okuCard: e.target.files![0] })); }} className="mt-1 text-xs h-8" />
                    </div>
                    <div>
                      <Label htmlFor="edit-drivingLicense" className="text-xs">{language === 'en' ? 'Driving License' : 'Lesen Memandu'}</Label>
                      {currentDocUrls.drivingLicense && <a href={currentDocUrls.drivingLicense} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline block mt-1">Lihat Semasa</a>}
                      <Input id="edit-drivingLicense" type="file" accept="image/*,.pdf" onChange={(e) => { if (e.target.files?.[0]) setEditDocuments(prev => ({ ...prev, drivingLicense: e.target.files![0] })); }} className="mt-1 text-xs h-8" />
                    </div>
                    <div>
                      <Label htmlFor="edit-passportPhoto" className="text-xs">{language === 'en' ? 'Passport Photo' : 'Gambar Pasport'}</Label>
                      {currentDocUrls.passportPhoto && <a href={currentDocUrls.passportPhoto} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline block mt-1">Lihat Semasa</a>}
                      <Input id="edit-passportPhoto" type="file" accept="image/*,.pdf" onChange={(e) => { if (e.target.files?.[0]) setEditDocuments(prev => ({ ...prev, passportPhoto: e.target.files![0] })); }} className="mt-1 text-xs h-8" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Footer */}
          <div className="border-t pt-3 pb-2 px-4 flex items-center justify-between bg-gray-50">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setEditStep(prev => Math.max(1, prev - 1) as 1 | 2 | 3)}
              disabled={editStep === 1}
              className="text-xs h-8"
            >
              <span className="mr-1">◀</span> Sebelumnya
            </Button>
            
            <div className="text-xs text-gray-600">
              Step {editStep} of 3
            </div>
            
            {editStep < 3 ? (
              <Button 
                size="sm"
                onClick={() => setEditStep(prev => Math.min(3, prev + 1) as 1 | 2 | 3)}
                className="text-xs h-8"
              >
                Seterusnya <span className="ml-1">▶</span>
              </Button>
            ) : (
              <Button 
                size="sm"
                onClick={handleSaveEdit} 
                disabled={isUpdating}
                className="text-xs h-8"
              >
                {isUpdating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-3 h-3 mr-1" />
                    Simpan Perubahan
                  </>
                )}
              </Button>
            )}
          </div>
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

      {/* Import CSV/Excel Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg">Import</DialogTitle>
            <DialogDescription className="text-xs">
              Muat naik fail untuk import permohonan secara pukal. Semua rekod dianggap permohonan baharu.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 overflow-y-auto flex-1 pr-2">
            <div>
              <Label htmlFor="import-file" className="mb-1 block text-xs font-semibold">Pilih Fail</Label>
              <Input
                id="import-file"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                disabled={isImporting}
                className="text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">Format: CSV, XLSX, XLS</p>
            </div>

            {importFile && (
              <div className="p-2 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-xs font-semibold text-green-800">{importFile.name}</p>
                    <p className="text-[10px] text-green-600">{(importFile.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-sm text-blue-900">{language === 'en' ? 'Column Format' : 'Format Lajur'}</p>
                  <p className="text-xs text-blue-700">{language === 'en' ? 'Follow this exact order' : 'Ikut susunan tepat ini'}</p>
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto bg-white rounded-lg p-3 border border-blue-100">
                <ol className="text-xs text-gray-700 space-y-1.5 ml-4 list-decimal">
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
              <div className="mt-1.5">
                <Button
                  variant="default"
                  size="sm"
                  className="w-full text-[11px] h-7 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  onClick={() => {
                    // Create CSV template
                    const headers = ['No. Siri', 'Jenis', 'No. IC', 'Nama', 'No. Kad OKU', 'No. Tel', 'No. Kereta', 'Kategori OKU', 'No. Akaun Cukai Taksiran', 'Alamat', 'Status', 'Tarikh Mohon', 'Tarikh Lulus', 'Tarikh Tamat Tempoh', 'Sesi'];
                    const exampleRow = ['1', 'Baharu', '990101011234', 'Ahmad Bin Ali', 'OKU12345', '0123456789', 'ABC1234', 'Penglihatan', '1234567', 'No 123, Jalan Merdeka', 'Diluluskan', '2025-01-01', '2025-01-15', '2027-12-31', '2025'];
                    const csvContent = [headers.join(','), exampleRow.join(',')].join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = 'template_import_permohonan.csv';
                    link.click();
                    toast.success(language === 'en' ? 'Template downloaded!' : 'Templat berjaya dimuat turun!');
                  }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {language === 'en' ? 'Download Template' : 'Muat Turun Templat'}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3 pt-2 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowImportModal(false);
                setImportFile(null);
              }}
              disabled={isImporting}
              className="flex-1"
            >
              {language === 'en' ? 'Cancel' : 'Batal'}
            </Button>
            <Button 
              onClick={handleBulkImport}
              disabled={isImporting || !importFile}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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

      <Footer />
    </>
  );
}
