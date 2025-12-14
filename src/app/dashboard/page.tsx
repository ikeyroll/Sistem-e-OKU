"use client";

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getDashboardStats, getMonthlyStats, getApplicationsForExport } from '@/lib/api/applications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Users, CheckCircle2, Eye, EyeOff, Settings, AlertCircle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import MapPicker from '@/components/MapPicker';
import DashboardMap from '@/components/DashboardMap';
import { useLanguage } from '@/contexts/LanguageContext';
import { loadBoundaryGeoJSON, isPointInsideGeoJSON } from '@/lib/geo';

interface DashboardStats {
  total: number;
  berjaya?: number;
  byStatus: {
    pending: number;
    approved: number;
    rejected: number;
  };
  byMonth: { month: string; count: number }[];
  lastUpdated: string;
}

// Helper function to get session in format YYYY/YYYY+2 from a date
const getSessionFromDate = (dateString: string | null): string => {
  if (!dateString) return '';
  try {
    const year = new Date(dateString).getFullYear();
    return `${year}/${year + 2}`;
  } catch (e) {
    return '';
  }
};

// Function to get unique sessions from stats data
const getUniqueSessions = (stats: DashboardStats | null): string[] => {
  if (!stats) return [];
  
  // Always include current and next session
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  // If we're in the second half of the year (July-December), include next year's session
  const sessions = new Set<string>();
  const currentSession = currentMonth >= 6 
    ? `${currentYear + 1}/${currentYear + 3}`
    : `${currentYear}/${currentYear + 2}`;
  
  sessions.add(currentSession);
  
  // Add sessions from the last 5 years
  const startYear = currentMonth >= 6 ? currentYear : currentYear - 1;
  for (let i = 0; i <= 5; i++) {
    const year = startYear - i;
    sessions.add(`${year}/${year + 2}`);
  }
  
  // Sort sessions in descending order (newest first)
  return Array.from(sessions).sort((a, b) => {
    const yearA = parseInt(a.split('/')[0]);
    const yearB = parseInt(b.split('/')[0]);
    return yearB - yearA;
  });
};

// --- DUMMY DATA GENERATORS ---
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
      
      // Random date within the year
      const month = Math.floor(Math.random() * 12);
      const day = 1 + Math.floor(Math.random() * 28);
      const date = new Date(year, month, day);
      
      // Generate coords within mukim's radius (realistic clustering)
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * mukimCoord.radius;
      const lat = mukimCoord.lat + distance * Math.cos(angle);
      const lon = mukimCoord.lon + distance * Math.sin(angle);

      apps.push({
        id: `${mukim}-${i}`,
        daerah: 'Hulu Selangor',
        mukim: mukim,
        status: status,
        latitude: lat,
        longitude: lon,
        created_at: date.toISOString(),
        pemohon: { name: `Pemohon ${mukim} ${i + 1}` }
      });
    }
  });
  
  return apps;
};

const generateDummyStats = (year: number, apps: any[]) => {
  const byStatus = {
    pending: apps.filter(a => a.status === 'Dalam Proses').length,
    approved: apps.filter(a => ['Diluluskan', 'Sedia Diambil', 'Telah Diambil'].includes(a.status)).length,
    rejected: apps.filter(a => a.status === 'Tidak Lengkap' || a.status === 'Tidak Berjaya').length
  };
  
  // Group by month
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const byMonth = months.map((m, idx) => {
    return {
      month: m,
      count: apps.filter(a => new Date(a.created_at).getMonth() === idx).length
    };
  });

  return {
    total: apps.length,
    berjaya: byStatus.approved,
    byStatus,
    byMonth,
    lastUpdated: new Date().toLocaleString('ms-MY')
  };
};
// -----------------------------

export default function Dashboard() {
  const { language, t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get the current session based on the current date (2-year period)
  const getCurrentSession = () => {
    const currentYear = new Date().getFullYear();
    // If we're in the second half of the year, use next year as start
    const startYear = new Date().getMonth() >= 6 ? currentYear + 1 : currentYear;
    const endYear = startYear + 2; // 2-year period
    return `${startYear}/${endYear}`;
  };
  
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [availableSessions, setAvailableSessions] = useState<string[]>([]);
  // Interactive map state
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [address, setAddress] = useState<string>('');
  const [daerah, setDaerah] = useState<string>('');
  const [mukim, setMukim] = useState<string>('');
  const [appsInSession, setAppsInSession] = useState<any[]>([]);
  const [successfulInArea, setSuccessfulInArea] = useState<number>(0);
  const [boundary, setBoundary] = useState<any | null>(null);
  const [boundaryLoaded, setBoundaryLoaded] = useState<boolean>(false);
  const [isInsideDistrict, setIsInsideDistrict] = useState<boolean>(true);

  // Toggle visibility states for dashboard sections
  const [showSettings, setShowSettings] = useState(false);
  const [visibility, setVisibility] = useState({
    totalApps: true,
    successfulApps: true,
    inProgress: true,
    interactiveMap: true,
    monthlyTrend: true,
    mukimChart: true,
    statusChart: true,
  });
  const [isAdminBoss, setIsAdminBoss] = useState(false);
  const [tidakLengkapCount, setTidakLengkapCount] = useState(0);
  const [showApplicantDialog, setShowApplicantDialog] = useState(false);
  const [selectedApplicants, setSelectedApplicants] = useState<any[]>([]);
  const [dialogTitle, setDialogTitle] = useState('');

  // Check if user is admin_boss (only boss can toggle visibility)
  useEffect(() => {
    const adminLoggedIn = localStorage.getItem('adminLoggedIn');
    const adminRole = localStorage.getItem('adminRole');
    setIsAdminBoss(adminLoggedIn === 'true' && adminRole === 'admin_boss');
  }, []);

  // Load Hulu Selangor boundary once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = process.env.NEXT_PUBLIC_HULU_SELANGOR_GEOJSON_URL || '/hulu-selangor.geojson';
        const gj = await loadBoundaryGeoJSON(url);
        if (!cancelled) {
          setBoundary(gj);
          setBoundaryLoaded(true);
        }
      } catch (e) {
        console.error('Failed to load boundary GeoJSON:', e);
        if (!cancelled) setBoundaryLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  
  // Initialize sessions after component mounts and when stats change
  useEffect(() => {
    if (stats) {
      const sessions = getUniqueSessions(stats);
      setAvailableSessions(sessions);
      
      // Set selected session if not already set
      if (!selectedSession && sessions.length > 0) {
        setSelectedSession(sessions[0]);
      }
    }
  }, [stats]);

  useEffect(() => {
    // Extract the start year from the selected session (e.g., '2023/2024' -> 2023)
    if (selectedSession === 'all') {
      loadDashboardData('all');
    } else if (selectedSession) {
      const year = parseInt(selectedSession.split('/')[0]);
      loadDashboardData(year.toString());
    }
  }, [selectedSession]);

  const loadDashboardData = async (year: string) => {
    setIsLoading(true);
    
    try {
      // Use real database data
      let apps;
      if (year === 'all') {
        const { getApplications } = await import('@/lib/api/applications');
        apps = await getApplications();
      } else {
        const { getApplications } = await import('@/lib/api/applications');
        const allApps = await getApplications();
        const yearNum = parseInt(year);
        apps = allApps.filter(app => {
          const submittedYear = app.submitted_date ? new Date(app.submitted_date).getFullYear() : null;
          const approvedYear = app.approved_date ? new Date(app.approved_date).getFullYear() : null;
          return submittedYear === yearNum || approvedYear === yearNum;
        });
      }
      
      // Import location matcher and update function
      const { updateApplication } = await import('@/lib/api/applications');
      const { extractCoordinatesFromAddress } = await import('@/lib/locationMatcher');
      
      // Process applications with REAL address-based coordinate assignment
      const processedApps = [];
      let matchedCount = 0;
      let failedCount = 0;
      
      console.log(`\n🔄 Processing ${apps.length} applications...`);
      
      for (const app of apps) {
        const pemohon = typeof app.pemohon === 'string' ? JSON.parse(app.pemohon) : app.pemohon;
        
        let latitude = app.latitude;
        let longitude = app.longitude;
        
        // Extract coordinates from REAL address if missing
        if (!latitude || !longitude) {
          const mukim = app.mukim || pemohon?.address?.mukim || pemohon?.mukim || '';
          const daerah = app.daerah || pemohon?.address?.daerah || pemohon?.daerah || 'Hulu Selangor';
          
          const addressParts = [];
          if (pemohon?.address?.street) addressParts.push(pemohon.address.street);
          if (pemohon?.street) addressParts.push(pemohon.street);
          if (pemohon?.alamat) addressParts.push(pemohon.alamat);
          if (pemohon?.address?.mukim) addressParts.push(pemohon.address.mukim);
          else if (pemohon?.mukim) addressParts.push(pemohon.mukim);
          else if (mukim) addressParts.push(mukim);
          if (pemohon?.address?.daerah) addressParts.push(pemohon.address.daerah);
          else if (pemohon?.daerah) addressParts.push(pemohon.daerah);
          else if (daerah) addressParts.push(daerah);
          if (pemohon?.address?.poskod) addressParts.push(pemohon.address.poskod);
          else if (pemohon?.poskod) addressParts.push(pemohon.poskod);
          addressParts.push('Selangor');
          
          const fullAddress = addressParts.filter(p => p).join(', ');
          
          const coords = extractCoordinatesFromAddress(fullAddress, mukim, daerah);
          
          if (coords) {
            latitude = coords.lat;
            longitude = coords.lon;
            matchedCount++;
            console.log(`✅ ${app.ref_no}: Matched location`);
            
            // Save to database
            updateApplication(app.id, { latitude, longitude }).catch(err => 
              console.warn(`Failed to save coords for ${app.ref_no}:`, err)
            );
          } else {
            failedCount++;
            console.error(`❌ ${app.ref_no}: NO MATCH`);
            console.error(`   Address: "${fullAddress}"`);
            
            // Fallback to default center
            const angle = Math.random() * 2 * Math.PI;
            const distance = Math.random() * 0.05;
            latitude = 3.5667 + distance * Math.cos(angle);
            longitude = 101.6500 + distance * Math.sin(angle);
          }
        }
        
        processedApps.push({
          ...app,
          pemohon,
          latitude,
          longitude,
          daerah: app.daerah || pemohon?.address?.daerah || 'Hulu Selangor',
          mukim: app.mukim || pemohon?.address?.mukim || '',
        });
      }
      
      console.log(`\n📊 LOCATION MATCHING SUMMARY:`);
      console.log(`   Total: ${apps.length}`);
      console.log(`   ✅ Matched: ${matchedCount}`);
      console.log(`   ❌ Failed: ${failedCount}`);
      console.log(`\n`);
      
      const dashboardData = generateDummyStats(year === 'all' ? new Date().getFullYear() : parseInt(year), processedApps);
      
      setStats(dashboardData);
      setAppsInSession(processedApps || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setStats({
        total: 0,
        berjaya: 0,
        byStatus: { pending: 0, approved: 0, rejected: 0 },
        byMonth: [],
        lastUpdated: new Date().toLocaleString('ms-MY'),
      });
      setAppsInSession([]);
    } finally {
      setIsLoading(false);
    }
  };

  const COLORS = {
    pending: '#f59e0b',
    approved: '#10b981',
    rejected: '#ef4444',
  };

  const isSuccess = (s: string) => ['Diluluskan', 'Sedia Diambil', 'Telah Diambil'].includes(s);

  // Prepare data for the application status chart
  // Now showing three statuses: Dalam Proses, Diluluskan, and Tidak Lengkap
  const statusData = [
    { 
      name: 'Dalam Proses', 
      value: stats?.byStatus.pending || 0, 
      color: '#f59e0b'  // Yellow
    },
    { 
      name: 'Diluluskan', 
      value: stats?.byStatus.approved || 0,
      color: '#10b981'  // Green
    },
    { 
      name: 'Tidak Lengkap', 
      value: stats?.byStatus.rejected || 0,
      color: '#ef4444'  // Red
    }
  ];
  
  // Calculate total from all statuses
  const totalFromStatuses = statusData.reduce((sum, item) => sum + item.value, 0);
  const totalFromStats = stats?.total || 0;
  
  // Log the status counts for debugging
  console.log('Status counts for session', selectedSession, ':', {
    'Dalam Proses': stats?.byStatus.pending,
    'Diluluskan': stats?.byStatus.approved,
    'Tidak Lengkap': stats?.byStatus.rejected,
    'Total from statuses': totalFromStatuses,
    'Total from stats': totalFromStats,
    'Match': totalFromStatuses === totalFromStats ? '✅' : '❌'
  });
  
  // Status colors mapping
  const statusColors = {
    'Dalam Proses': '#f59e0b',  // Yellow
    'Diluluskan': '#10b981',    // Green
    'Tidak Lengkap': '#ef4444'  // Red
  };

  // Recalculate successful count for selected daerah/mukim on changes
  useEffect(() => {
    if (!appsInSession || appsInSession.length === 0) {
      setSuccessfulInArea(0);
      return;
    }
    
    // If no filter selected, show total
    if (!daerah && !mukim) {
      const count = appsInSession.filter(app => isSuccess(app.status)).length;
      setSuccessfulInArea(count);
      return;
    }
    
    // Priority: If mukim is selected, count only for that mukim (ignore daerah)
    // Otherwise, count for daerah
    const count = appsInSession.filter(app => {
      const d = app.daerah || '';
      const m = app.mukim || '';
      
      if (mukim) {
        // Only count for the selected mukim
        return isSuccess(app.status) && m === mukim;
      } else if (daerah) {
        // Only count for the selected daerah
        return isSuccess(app.status) && d === daerah;
      }
      return false;
    }).length;
    setSuccessfulInArea(count);
  }, [appsInSession, daerah, mukim]);

  // When session data is loaded the first time, pick a random successful app
  // (with coordinates) to show as the initial location
  useEffect(() => {
    if (!appsInSession || appsInSession.length === 0) return;
    // If we already have a location or selection, don't override
    if (latitude != null || longitude != null || daerah || mukim) return;

    const withCoords = appsInSession.filter(app => app.latitude != null && app.longitude != null);
    if (withCoords.length === 0) return;

    const successfulWithCoords = withCoords.filter(app => isSuccess(app.status));
    const source = successfulWithCoords.length > 0 ? successfulWithCoords : withCoords;
    const random = source[Math.floor(Math.random() * source.length)];

    setLatitude(random.latitude ?? null);
    setLongitude(random.longitude ?? null);
    setDaerah(random.daerah || '');
    setMukim(random.mukim || '');
  }, [appsInSession, latitude, longitude, daerah, mukim]);

  // Update map location when mukim or daerah changes
  useEffect(() => {
    if (!appsInSession || appsInSession.length === 0) return;
    if (!mukim && !daerah) return;

    // Filter apps by selected mukim or daerah
    const filtered = appsInSession.filter(app => {
      const m = app.mukim || '';
      const d = app.daerah || '';
      return (mukim && m === mukim) || (daerah && d === daerah);
    }).filter(app => app.latitude != null && app.longitude != null);

    if (filtered.length === 0) return;

    // Pick a random location from filtered apps
    const random = filtered[Math.floor(Math.random() * filtered.length)];
    setLatitude(random.latitude ?? null);
    setLongitude(random.longitude ?? null);
  }, [mukim, daerah, appsInSession]);

  // Recompute inside-district when coordinates change
  useEffect(() => {
    if (!boundaryLoaded || !boundary) return;
    if (latitude == null || longitude == null) return;
    try {
      const inside = isPointInsideGeoJSON([longitude, latitude] as any, boundary as any);
      setIsInsideDistrict(!!inside);
    } catch (e) {
      console.warn('PIP check failed:', e);
      setIsInsideDistrict(true);
    }
  }, [latitude, longitude, boundaryLoaded, boundary]);

  // Calculate data for Kategori OKU Bar Chart
  const kategoriOKUData = appsInSession.reduce((acc: any[], app: any) => {
    const kategori = app.pemohon?.okuCategory || 'Tidak Diketahui';
    const existing = acc.find(item => item.name === kategori);
    if (existing) {
      existing.value++;
    } else {
      acc.push({ name: kategori, value: 1 });
    }
    return acc;
  }, []).sort((a: any, b: any) => b.value - a.value);

  // Calculate data for Aktif/Tidak Aktif Status Chart
  const aktivStatusData = appsInSession.reduce((acc: { aktif: number; tidakAktif: number }, app: any) => {
    const isAktif = (app.status === 'Diluluskan' || app.status === 'Sedia Diambil' || app.status === 'Telah Diambil') && 
                   (!app.expiry_date || new Date(app.expiry_date) >= new Date());
    
    if (isAktif) {
      acc.aktif++;
    } else {
      acc.tidakAktif++;
    }
    return acc;
  }, { aktif: 0, tidakAktif: 0 });

  const aktivStatusChartData = [
    { name: 'Aktif', value: aktivStatusData.aktif, color: '#10b981' },
    { name: 'Tidak Aktif', value: aktivStatusData.tidakAktif, color: '#6b7280' }
  ];

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen py-12 bg-gradient-to-br from-primary/5 to-background">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Memuat data...</p>
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
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{t('dashboard.title')}</h1>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Pilih Sesi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {language === 'en' ? 'All Sessions' : 'Semua Sesi'}
                    </SelectItem>
                    {availableSessions.map(session => (
                      <SelectItem key={session} value={session}>
                        Sesi {session}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isAdminBoss && (
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 rounded-lg border hover:bg-gray-100 transition-colors"
                  title="Toggle Section Visibility"
                >
                  <Settings className="h-5 w-5" />
                </button>
                )}
              </div>
            </div>
          </div>

          {/* Visibility Settings Panel */}
          {isAdminBoss && showSettings && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg">{language === 'en' ? 'Dashboard Sections' : 'Bahagian Dashboard'}</CardTitle>
                <CardDescription>{language === 'en' ? 'Toggle visibility of dashboard sections' : 'Togol paparan bahagian dashboard'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="total-apps"
                      checked={visibility.totalApps}
                      onCheckedChange={(checked) => setVisibility(prev => ({ ...prev, totalApps: checked }))}
                    />
                    <Label htmlFor="total-apps" className="text-sm cursor-pointer">
                      {language === 'en' ? 'Total Applications' : 'Jumlah Permohonan'}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="successful-apps"
                      checked={visibility.successfulApps}
                      onCheckedChange={(checked) => setVisibility(prev => ({ ...prev, successfulApps: checked }))}
                    />
                    <Label htmlFor="successful-apps" className="text-sm cursor-pointer">
                      {language === 'en' ? 'Successful Apps' : 'Permohonan Berjaya'}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="in-progress"
                      checked={visibility.inProgress}
                      onCheckedChange={(checked) => setVisibility(prev => ({ ...prev, inProgress: checked }))}
                    />
                    <Label htmlFor="in-progress" className="text-sm cursor-pointer">
                      {language === 'en' ? 'In Progress' : 'Dalam Proses'}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="interactive-map"
                      checked={visibility.interactiveMap}
                      onCheckedChange={(checked) => setVisibility(prev => ({ ...prev, interactiveMap: checked }))}
                    />
                    <Label htmlFor="interactive-map" className="text-sm cursor-pointer">
                      {language === 'en' ? 'Interactive Map' : 'Peta Interaktif'}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="monthly-trend"
                      checked={visibility.monthlyTrend}
                      onCheckedChange={(checked) => setVisibility(prev => ({ ...prev, monthlyTrend: checked }))}
                    />
                    <Label htmlFor="monthly-trend" className="text-sm cursor-pointer">
                      {language === 'en' ? 'Monthly Trend' : 'Trend Bulanan'}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="mukim-chart"
                      checked={visibility.mukimChart}
                      onCheckedChange={(checked) => setVisibility(prev => ({ ...prev, mukimChart: checked }))}
                    />
                    <Label htmlFor="mukim-chart" className="text-sm cursor-pointer">
                      {language === 'en' ? 'By Mukim' : 'Mengikut Mukim'}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="status-chart"
                      checked={visibility.statusChart}
                      onCheckedChange={(checked) => setVisibility(prev => ({ ...prev, statusChart: checked }))}
                    />
                    <Label htmlFor="status-chart" className="text-sm cursor-pointer">
                      {language === 'en' ? 'Status Chart' : 'Status Permohonan'}
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          {(visibility.totalApps || visibility.successfulApps || visibility.inProgress) && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {visibility.totalApps && (
            <Card className="text-center py-6">
              <CardContent className="pt-6">
                <div className="text-5xl font-bold mb-2">{stats?.total}</div>
                <p className="text-sm font-medium">{language === 'en' ? 'Total Applications' : 'Jumlah Permohonan'}</p>
                <p className="text-xs text-muted-foreground mt-1">Sesi {selectedSession}</p>
              </CardContent>
            </Card>
            )}

            {visibility.successfulApps && (
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow text-center py-6"
              onClick={() => {
                const apps = appsInSession.filter(a => ['Diluluskan', 'Sedia Diambil', 'Telah Diambil'].includes(a.status));
                setSelectedApplicants(apps);
                setDialogTitle(language === 'en' ? 'Successful Applications' : 'Permohonan Berjaya');
                setShowApplicantDialog(true);
              }}
            >
              <CardContent className="pt-6">
                <div className="text-5xl font-bold text-green-700 mb-2">{stats?.berjaya ?? 0}</div>
                <p className="text-sm font-medium">{language === 'en' ? 'Successful Applications' : 'Permohonan Berjaya'}</p>
                <p className="text-xs text-muted-foreground mt-1">{language === 'en' ? 'Approved + Ready + Collected' : 'Diluluskan + Sedia Diambil + Telah Diambil'}</p>
              </CardContent>
            </Card>
            )}

            {visibility.inProgress && (
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow text-center py-6"
              onClick={() => {
                const apps = appsInSession.filter(a => a.status === 'Dalam Proses');
                setSelectedApplicants(apps);
                setDialogTitle(language === 'en' ? 'In Progress Applications' : 'Permohonan Dalam Proses');
                setShowApplicantDialog(true);
              }}
            >
              <CardContent className="pt-6">
                <div className="text-5xl font-bold mb-2" style={{ color: statusColors['Dalam Proses'] }}>{stats?.byStatus.pending || 0}</div>
                <p className="text-sm font-medium">{language === 'en' ? 'In Progress' : 'Dalam Proses'}</p>
                <p className="text-xs text-muted-foreground mt-1">Sedang diproses</p>
              </CardContent>
            </Card>
            )}

            {/* Tidak Lengkap Card */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow text-center py-6"
              onClick={() => {
                const apps = appsInSession.filter(a => a.status === 'Tidak Lengkap');
                setSelectedApplicants(apps);
                setDialogTitle(language === 'en' ? 'Incomplete Applications' : 'Permohonan Tidak Lengkap');
                setShowApplicantDialog(true);
              }}
            >
              <CardContent className="pt-6">
                <div className="text-5xl font-bold text-red-600 mb-2">{stats?.byStatus.rejected || 0}</div>
                <p className="text-sm font-medium text-red-600">{language === 'en' ? 'Incomplete' : 'Tidak Lengkap'}</p>
                <p className="text-xs text-muted-foreground mt-1">{language === 'en' ? 'Incomplete documents' : 'Dokumen tidak lengkap'}</p>
              </CardContent>
            </Card>
          </div>
          )}

          {/* Interactive Map Full Width */}
          {visibility.interactiveMap && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{language === 'en' ? 'Interactive Map - Application Distribution' : 'Peta Interaktif - Taburan Permohonan'}</CardTitle>
              <CardDescription>{language === 'en' ? 'View application distribution on the map' : 'Lihat taburan permohonan pada peta'}</CardDescription>
            </CardHeader>
            <CardContent>

                {/* Interactive Map */}
                <div>
                  <DashboardMap
                    applications={appsInSession}
                    selectedMukim={mukim}
                    selectedDaerah={daerah}
                    height={450}
                    onLocationChange={(loc) => {
                      if (loc.address) setAddress(loc.address);
                      setLatitude(loc.lat);
                      setLongitude(loc.lon);
                      if (loc.daerah) setDaerah(loc.daerah);
                      if (loc.mukim) setMukim(loc.mukim);
                    }}
                  />
                </div>
            </CardContent>
          </Card>
          )}

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {visibility.monthlyTrend && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{language === 'en' ? 'Monthly Trend' : 'Trend Bulanan'}</CardTitle>
                <CardDescription>{language === 'en' ? 'Applications by month' : 'Permohonan mengikut bulan'} (Sesi {selectedSession})</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats?.byMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name={language === 'en' ? 'Number of Applications' : 'Bilangan Permohonan'}
                      dot={{ fill: '#3b82f6', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            )}

            {visibility.mukimChart && (
            <Card>
              <CardHeader>
                <CardTitle>{language === 'en' ? 'Applications by OKU Category' : 'Permohonan Mengikut Kategori OKU'}</CardTitle>
                <CardDescription>{language === 'en' ? 'Distribution by disability category' : 'Taburan mengikut kategori kecacatan'}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={kategoriOKUData} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100}
                      style={{ fontSize: '9px' }}
                      tick={{ fontSize: 9 }}
                    />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar 
                      dataKey="value" 
                      fill="#8b5cf6" 
                      name={language === 'en' ? 'Count' : 'Bilangan'}
                      radius={[0, 4, 4, 0]}
                      label={{ position: 'right', fontSize: 10 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            )}

            {visibility.statusChart && (
            <Card>
              <CardHeader>
                <CardTitle>{language === 'en' ? 'Active Status' : 'Status Aktif'}</CardTitle>
                <CardDescription>{language === 'en' ? 'Active vs Inactive applications' : 'Permohonan Aktif vs Tidak Aktif'}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={aktivStatusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {aktivStatusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            )}
          </div>
        </div>
      </main>
      <Footer />

      {/* Applicant Dialog */}
      <Dialog open={showApplicantDialog} onOpenChange={setShowApplicantDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {language === 'en' ? 'List of applicants' : 'Senarai pemohon'} ({selectedApplicants.length})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {selectedApplicants.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {language === 'en' ? 'No applicants found' : 'Tiada pemohon dijumpai'}
              </p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">{language === 'en' ? 'Name' : 'Nama'}</th>
                      <th className="text-left p-3 font-medium">{language === 'en' ? 'OKU Type' : 'Kategori OKU'}</th>
                      <th className="text-left p-3 font-medium">{language === 'en' ? 'Status' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedApplicants.map((app, index) => (
                      <tr key={app.id || index} className="border-t hover:bg-muted/50">
                        <td className="p-3">{app.pemohon?.name || app.full_name || '-'}</td>
                        <td className="p-3">{app.oku_type || app.kategori_oku || '-'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            app.status === 'Tidak Lengkap' ? 'bg-red-100 text-red-700' :
                            app.status === 'Dalam Proses' ? 'bg-yellow-100 text-yellow-700' :
                            ['Diluluskan', 'Sedia Diambil', 'Telah Diambil'].includes(app.status) ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {app.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setShowApplicantDialog(false)}>
              {language === 'en' ? 'Close' : 'Tutup'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}