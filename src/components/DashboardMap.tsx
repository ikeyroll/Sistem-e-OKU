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
    pemohon?: { name?: string; okuCategory?: string };
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
const getStatusColor = (status?: string): string => {
  switch (status) {
    case 'Diluluskan':
    case 'Sedia Diambil':
    case 'Telah Diambil':
      return '#10b981'; // Green for approved/ready/collected
    case 'Dalam Proses':
      return '#f59e0b'; // Yellow for in progress
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
  const filteredApps = applications.filter(app => {
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
        mapRef.current = L.map(containerRef.current).setView([view.lat, view.lon], view.zoom);
        
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
          m.remove();
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
      
      if (!lat || !lon || isNaN(lat) || isNaN(lon)) return;
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return;
      
      const color = getStatusColor(app.status);
      
      try {
        // Create circle marker for each application
        const marker = L.circleMarker([lat, lon], {
          radius: 8,
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        }).addTo(mapRef.current);

        // Add popup with info
        const popupContent = `
          <div style="min-width: 180px; padding: 4px;">
            <div style="margin-bottom: 6px;"><strong>Nama Pemohon:</strong><br/>${app.pemohon?.name || 'N/A'}</div>
            <div style="margin-bottom: 6px;"><strong>Kategori OKU:</strong><br/>${app.pemohon?.okuCategory || 'N/A'}</div>
            <div><strong>Status:</strong><br/><span style="color: ${color};">● ${app.status || 'N/A'}</span></div>
          </div>
        `;
        marker.bindPopup(popupContent);
        
        markersRef.current.push(marker);
      } catch (e) {
        console.warn('Failed to add marker for app:', app.id, e);
      }
    });

    // Update map view based on selection
    const view = getMapView();
    if (view.lat && view.lon && !isNaN(view.lat) && !isNaN(view.lon)) {
      mapRef.current.setView([view.lat, view.lon], view.zoom);
    }

  }, [filteredApps, selectedMukim, selectedDaerah, isLoaded]);

  return (
    <div>
      {/* Map stats */}
      {selectedMukim && (
        <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
          <strong>Mukim {selectedMukim}:</strong> {filteredApps.length} permohonan berjaya dipaparkan pada peta
        </div>
      )}

      {/* Map container */}
      <div style={{ position: 'relative' }}>
        <div
          ref={containerRef}
          style={{
            height: height,
            width: '100%',
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid hsl(var(--border))'
          }}
        />
      </div>

      {/* Stats and Instructions - Side by Side */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Stats Box */}
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-medium text-green-800 mb-1">Dipapar Pada Peta</p>
          <p className="text-xs text-green-700 mb-2">Berjaya sahaja</p>
          <div className="text-3xl font-bold text-green-700">{filteredApps.length}</div>
        </div>

        {/* Instructions Box */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-800 mb-1">📍 Cara Menggunakan Peta Interaktif (Taburan Permohonan Berjaya):</p>
          <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
            <li><strong>Peta ini hanya memaparkan permohonan BERJAYA</strong> (Diluluskan, Sedia Diambil, Telah Diambil)</li>
            <li><strong>Klik pada bulatan hijau</strong> untuk melihat maklumat permohonan (Nama Pemohon, Kategori OKU, Status)</li>
            <li>Lokasi berdasarkan alamat yang diisi oleh pemohon dalam borang permohonan</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DashboardMap;
