"use client";

import React, { useEffect, useRef, useState } from 'react';
import { reverseGeocode, extractDaerahMukim } from '@/lib/geo';

export interface DashboardMapProps {
  applications: Array<{
    id: number | string;
    latitude?: number | null;
    longitude?: number | null;
    mukim?: string;
    daerah?: string;
    status?: string;
    aktif_status?: string;
    pemohon?: { name?: string; okuCategory?: string };
    oku_type?: string;
    kategori_oku?: string;
  }>;
  selectedMukim?: string;
  selectedDaerah?: string;
  onLocationChange?: (loc: { lat: number; lon: number; address?: string; daerah?: string; mukim?: string }) => void;
  height?: number;
}

// Mukim center coordinates for auto-zoom - All 13 Mukims
const MUKIM_CENTERS: Record<string, { lat: number; lon: number; zoom: number }> = {
  'Ulu Bernam': { lat: 3.6833, lon: 101.5000, zoom: 12 },
  'Sungai Tinggi': { lat: 3.6500, lon: 101.5500, zoom: 13 },
  'Sungai Gumut': { lat: 3.6000, lon: 101.5200, zoom: 13 },
  'Kuala Kalumpang': { lat: 3.5800, lon: 101.4800, zoom: 13 },
  'Kalumpang': { lat: 3.5500, lon: 101.5000, zoom: 13 },
  'Kerling': { lat: 3.4833, lon: 101.5833, zoom: 13 },
  'Buloh Telor': { lat: 3.5200, lon: 101.5800, zoom: 13 },
  'Ampang Pechah': { lat: 3.4000, lon: 101.5500, zoom: 13 },
  'Peretak': { lat: 3.4300, lon: 101.5700, zoom: 13 },
  'Rasa': { lat: 3.5000, lon: 101.5333, zoom: 13 },
  'Batang Kali': { lat: 3.4500, lon: 101.6333, zoom: 13 },
  'Ulu Yam': { lat: 3.4167, lon: 101.6833, zoom: 13 },
  'Serendah': { lat: 3.3667, lon: 101.6000, zoom: 13 },
};

// Default center for Hulu Selangor
const DEFAULT_CENTER = { lat: 3.5547, lon: 101.6463, zoom: 10 };

// Lightweight Leaflet loader via CDN
function ensureLeafletLoaded(): Promise<typeof window & { L: any }> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('No window'));
    const w = window as any;
    if (w.L) return resolve(w);

    // Inject CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    // Inject JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => resolve(window as any);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

// Status color mapping based on application status
// Green for successful, Red for incomplete
const getStatusColor = (status?: string): string => {
  switch (status) {
    case 'Diluluskan':
    case 'Sedia Diambil':
    case 'Telah Diambil':
      return '#10b981'; // Green for approved/ready/collected
    case 'Tidak Lengkap':
      return '#ef4444'; // Red for incomplete
    default:
      return '#6b7280'; // Gray for unknown
  }
};

export const DashboardMap: React.FC<DashboardMapProps> = ({
  applications,
  selectedMukim,
  selectedDaerah,
  onLocationChange,
  height = 500,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Filter applications based on selected mukim/daerah
  // Exclude 'Dalam Proses' - only show successful and incomplete
  const filteredApps = applications.filter(app => {
    // Exclude 'Dalam Proses'
    if (app.status === 'Dalam Proses') {
      return false;
    }
    
    if (!app.latitude || !app.longitude) {
      console.log('App filtered out - no coordinates:', app.id, app);
      return false;
    }
    if (selectedMukim && app.mukim !== selectedMukim) {
      console.log('App filtered out - mukim mismatch:', app.id, 'expected:', selectedMukim, 'got:', app.mukim);
      return false;
    }
    if (selectedDaerah && !selectedMukim && app.daerah !== selectedDaerah) {
      console.log('App filtered out - daerah mismatch:', app.id, 'expected:', selectedDaerah, 'got:', app.daerah);
      return false;
    }
    return true;
  });
  
  console.log('DashboardMap - Total apps:', applications.length, 'Filtered apps:', filteredApps.length);

  // Get center and zoom based on selection
  const getMapView = () => {
    if (selectedMukim && MUKIM_CENTERS[selectedMukim]) {
      return MUKIM_CENTERS[selectedMukim];
    }
    
    // Calculate center from filtered apps if available
    if (filteredApps.length > 0) {
      const validApps = filteredApps.filter(a => {
        const lat = Number(a.latitude);
        const lon = Number(a.longitude);
        return lat && lon && !isNaN(lat) && !isNaN(lon) && 
               lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
      });
      
      if (validApps.length > 0) {
        const lats = validApps.map(a => Number(a.latitude));
        const lons = validApps.map(a => Number(a.longitude));
        const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const centerLon = lons.reduce((a, b) => a + b, 0) / lons.length;
        
        if (!isNaN(centerLat) && !isNaN(centerLon)) {
          return { lat: centerLat, lon: centerLon, zoom: 12 };
        }
      }
    }
    
    return DEFAULT_CENTER;
  };

  // Initialize map
  useEffect(() => {
    let destroyed = false;
    (async () => {
      try {
        const w = await ensureLeafletLoaded();
        if (destroyed || !containerRef.current) return;
        const L = (w as any).L;
        
        const view = getMapView();
        // Validate coordinates before initializing map
        if (!view || !view.lat || !view.lon || 
            isNaN(view.lat) || isNaN(view.lon) ||
            view.lat < -90 || view.lat > 90 || 
            view.lon < -180 || view.lon > 180) {
          console.warn('Invalid coordinates for map initialization, using default');
          mapRef.current = L.map(containerRef.current).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lon], DEFAULT_CENTER.zoom);
        } else {
          mapRef.current = L.map(containerRef.current).setView([view.lat, view.lon], view.zoom);
        }
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapRef.current);
        
        setIsLoaded(true);
      } catch (e) {
        console.error('Map init failed', e);
      }
    })();
    
    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when applications or selection changes
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    const w = window as any;
    const L = w.L;
    if (!L) return;

    // Clear existing markers safely
    markersRef.current.forEach(m => {
      try {
        if (m && mapRef.current) {
          mapRef.current.removeLayer(m);
        }
      } catch (e) {
        // Ignore removal errors
      }
    });
    markersRef.current = [];

    // Add markers for filtered applications with valid coordinates
    filteredApps.forEach(app => {
      // Validate coordinates are valid numbers
      const lat = Number(app.latitude);
      const lon = Number(app.longitude);
      
      // Skip if coordinates are invalid
      if (!app.latitude || !app.longitude) return;
      if (isNaN(lat) || isNaN(lon)) return;
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return;
      
      const color = getStatusColor(app.status);
      
      try {
        // Parse pemohon if it's a string
        const pemohon = typeof app.pemohon === 'string' ? JSON.parse(app.pemohon) : app.pemohon;
        
        // Get OKU type from pemohon JSONB
        const okuType = pemohon?.okuCategory || app.oku_type || app.kategori_oku || 'N/A';
        
        // Get real status from application
        const realStatus = app.status || 'N/A';
        const aktivStatus = ['Diluluskan', 'Sedia Diambil', 'Telah Diambil'].includes(realStatus) ? 'Aktif' : 'Tidak Aktif';
        
        // Create circle marker for each application
        const marker = L.circleMarker([lat, lon], {
          radius: 8,
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        }).addTo(mapRef.current);

        // Add hover tooltip with only Status Aktif and Kategori OKU
        marker.bindTooltip(`
          <div style="font-size: 12px; padding: 4px;">
            <strong>Status:</strong> ${aktivStatus}<br/>
            <strong>Kategori OKU:</strong> ${okuType}
          </div>
        `, {
          direction: 'top',
          offset: [0, -10]
        });
        
        markersRef.current.push(marker);
      } catch (e) {
        console.warn('Failed to add marker for app:', app.id, e);
      }
    });

    // Update map view based on selection - only if we have valid coordinates
    const view = getMapView();
    if (view && view.lat && view.lon && 
        !isNaN(view.lat) && !isNaN(view.lon) &&
        view.lat >= -90 && view.lat <= 90 && 
        view.lon >= -180 && view.lon <= 180) {
      try {
        mapRef.current.setView([view.lat, view.lon], view.zoom);
      } catch (e) {
        console.warn('Failed to update map view:', e);
      }
    }

  }, [filteredApps, selectedMukim, selectedDaerah, isLoaded]);

  // Calculate successful and incomplete counts
  const successfulCount = filteredApps.filter(app => 
    ['Diluluskan', 'Sedia Diambil', 'Telah Diambil'].includes(app.status || '')
  ).length;
  const incompleteCount = filteredApps.filter(app => 
    app.status === 'Tidak Lengkap'
  ).length;

  return (
    <div>
      {/* Map container with proper z-index */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          ref={containerRef}
          style={{
            height: height,
            width: '100%',
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid hsl(var(--border))',
            position: 'relative',
            zIndex: 1
          }}
        />
      </div>

      {/* Stats and Instructions - Side by Side */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Stats Box */}
        <div className="p-3 bg-white border border-gray-200 rounded-lg">
          <p className="text-sm font-semibold text-gray-800 mb-2">Dipapar Pada Peta</p>
          <p className="text-xs text-gray-600 mb-1">Berjaya dan Tidak Lengkap</p>
          <div className="text-4xl font-bold text-blue-600">{filteredApps.length}</div>
        </div>

        {/* Instructions Box */}
        <div className="p-3 bg-white border border-blue-300 rounded-lg">
          <p className="text-sm font-semibold text-blue-700 mb-2">📍 Cara Menggunakan Peta Interaktif:</p>
          <ul className="text-xs text-gray-700 space-y-1">
            <li className="flex items-start">
              <span className="font-semibold mr-1">Circle Hijau:</span>
              <span>Permohonan Berjaya (Diluluskan, Sedia Diambil, Telah Diambil)</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-1">Circle Merah:</span>
              <span>Permohonan Tidak Lengkap</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-1">Hover pada circle</span>
              <span>untuk preview maklumat (Status Aktif, Jenis OKU)</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-1">Klik pada circle</span>
              <span>untuk maklumat penuh (Nama Pemohon, Status, dll)</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-1">Dikecualikan:</span>
              <span>Permohonan "Dalam Proses" tidak dipaparkan</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DashboardMap;
