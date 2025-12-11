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
    pemohon?: { name?: string };
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

// Status color mapping - all successful apps are green
const getStatusColor = (status?: string): string => {
  // Since this map only shows successful applications, always return green
  return '#10b981'; // green for all successful apps
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
  const mainMarkerRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ mukim?: string; daerah?: string } | null>(null);
  const [showOutsideWarning, setShowOutsideWarning] = useState(false);

  // Filter applications based on selected mukim/daerah
  const filteredApps = applications.filter(app => {
    if (!app.latitude || !app.longitude) return false;
    if (selectedMukim && app.mukim !== selectedMukim) return false;
    if (selectedDaerah && !selectedMukim && app.daerah !== selectedDaerah) return false;
    return true;
  });

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

        // Add main draggable marker
        mainMarkerRef.current = L.marker([view.lat, view.lon], { 
          draggable: true,
          zIndexOffset: 1000 
        }).addTo(mapRef.current);

        // Handle marker drag
        mainMarkerRef.current.on('dragend', async () => {
          const pos = mainMarkerRef.current.getLatLng();
          const rev = await reverseGeocode({ lat: pos.lat, lon: pos.lng });
          const em = extractDaerahMukim(rev?.address);
          setCurrentLocation({ mukim: em.mukim, daerah: em.daerah });
          
          // Check if location is outside Hulu Selangor
          if (!em.daerah || em.daerah.toLowerCase() !== 'hulu selangor') {
            setShowOutsideWarning(true);
            return;
          }
          
          if (onLocationChange) {
            onLocationChange({ lat: pos.lat, lon: pos.lng, address: rev?.display_name, daerah: em.daerah, mukim: em.mukim });
          }
        });

        // Handle map click to move marker
        mapRef.current.on('click', async (e: any) => {
          const { lat, lng } = e.latlng;
          mainMarkerRef.current.setLatLng([lat, lng]);
          const rev = await reverseGeocode({ lat, lon: lng });
          const em = extractDaerahMukim(rev?.address);
          setCurrentLocation({ mukim: em.mukim, daerah: em.daerah });
          
          // Check if location is outside Hulu Selangor
          if (!em.daerah || em.daerah.toLowerCase() !== 'hulu selangor') {
            setShowOutsideWarning(true);
            return;
          }
          
          if (onLocationChange) {
            onLocationChange({ lat, lon: lng, address: rev?.display_name, daerah: em.daerah, mukim: em.mukim });
          }
        });

        // Initialize current location based on selected mukim
        if (selectedMukim) {
          setCurrentLocation({ mukim: selectedMukim, daerah: selectedDaerah || 'Hulu Selangor' });
        }
        
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
          <div style="min-width: 150px;">
            <strong>${app.pemohon?.name || 'Pemohon'}</strong><br/>
            <span style="color: ${color};">● ${app.status || 'N/A'}</span><br/>
            <small>Mukim: ${app.mukim || '-'}</small>
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
      
      // Move main marker to center
      if (mainMarkerRef.current) {
        mainMarkerRef.current.setLatLng([view.lat, view.lon]);
      }
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
        
        {/* Popup Warning Overlay */}
        {showOutsideWarning && (
          <>
            {/* Semi-transparent backdrop */}
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                zIndex: 999,
                borderRadius: 8
              }}
              onClick={() => setShowOutsideWarning(false)}
            />
            {/* Warning popup */}
            <div 
              style={{
                position: 'absolute',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                maxWidth: '95%',
                minWidth: '280px'
              }}
            >
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 shadow-xl">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2">
                    <div className="text-red-600 text-lg">⚠️</div>
                    <div>
                      <h3 className="text-red-800 font-semibold text-sm mb-1">
                        Lokasi di Luar Kawasan
                      </h3>
                      <p className="text-red-700 text-xs">
                        Pin berada di luar daerah Hulu Selangor. Sila pilih lokasi dalam kawasan yang betul.
                      </p>
                      {currentLocation && (
                        <p className="text-red-600 text-xs mt-1">
                          <strong>Lokasi semasa:</strong> {currentLocation.daerah || 'Tidak dikenali'}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowOutsideWarning(false)}
                    className="text-red-600 hover:text-red-800 font-bold text-lg leading-none ml-2 hover:bg-red-100 rounded px-1"
                    style={{ minWidth: '20px' }}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Instructions - Below Map */}
      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm font-medium text-blue-800 mb-1">📍 Cara Menggunakan Peta Interaktif (Taburan Permohonan Berjaya):</p>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li><strong>Peta ini hanya memaparkan permohonan BERJAYA</strong> (Diluluskan, Sedia Diambil, Telah Diambil)</li>
          <li><strong>Pilih Mukim</strong> untuk zum automatik ke kawasan tersebut dan lihat taburan permohonan berjaya</li>
          <li><strong>Klik/Sentuh</strong> pada peta untuk meletakkan pin di lokasi tersebut</li>
          <li><strong>Seret pin utama</strong> (marker besar) untuk menggerakkan ke lokasi yang tepat</li>
          <li><strong>Klik pada bulatan hijau</strong> untuk melihat maklumat permohonan</li>
          <li>Lokasi berdasarkan alamat yang diisi oleh pemohon dalam borang permohonan</li>
          <li><strong>Contoh:</strong> Sekarang di Batang Kali, seret pin ke Rasa - data dan taburan akan berubah ke Rasa</li>
          <li><strong>Amaran:</strong> Jika pin diseret ke luar daerah Hulu Selangor, amaran akan dikeluarkan</li>
        </ul>
      </div>
    </div>
  );
};

export default DashboardMap;
