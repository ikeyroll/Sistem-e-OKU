"use client";

import React, { useEffect, useRef } from 'react';
import { reverseGeocode, extractDaerahMukim } from '@/lib/geo';

export interface MapPickerProps {
  address?: string;
  lat?: number | null;
  lon?: number | null;
  onLocationChange: (loc: { lat: number; lon: number; address?: string; daerah?: string; mukim?: string }) => void;
  invalid?: boolean; // when true, show warning popup and red border
  showInstructions?: boolean; // show usage instructions
  height?: number; // custom height for the map
}

// Lightweight Leaflet loader via CDN to avoid adding package dependency
function ensureLeafletLoaded(): Promise<typeof window & { L: any } > {
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

export const MapPicker: React.FC<MapPickerProps> = ({ address, lat, lon, onLocationChange, invalid, showInstructions = true, height = 320 }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const popupRef = useRef<any>(null);

  // Helper function to handle marker position update
  const handleMarkerUpdate = async (newLat: number, newLon: number) => {
    const rev = await reverseGeocode({ lat: newLat, lon: newLon });
    const em = extractDaerahMukim(rev?.address);
    onLocationChange({ lat: newLat, lon: newLon, address: rev?.display_name, daerah: em.daerah, mukim: em.mukim });
  };

  // Init map once
  useEffect(() => {
    let destroyed = false;
    (async () => {
      try {
        const w = await ensureLeafletLoaded();
        if (destroyed || !containerRef.current) return;
        const L = (w as any).L;
        mapRef.current = L.map(containerRef.current).setView([lat ?? 3.5547, lon ?? 101.6463], lat && lon ? 15 : 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapRef.current);

        // Add marker if lat/lon present
        const initialLat = lat ?? 3.5547;
        const initialLon = lon ?? 101.6463;
        markerRef.current = L.marker([initialLat, initialLon], { draggable: true }).addTo(mapRef.current);

        // Auto-trigger location callback on initial load if no coordinates provided
        if (!lat || !lon) {
          await handleMarkerUpdate(initialLat, initialLon);
        }

        // Handle marker drag end
        markerRef.current.on('dragend', async () => {
          const pos = markerRef.current.getLatLng();
          await handleMarkerUpdate(pos.lat, pos.lng);
        });

        // Handle map click/tap to move marker
        mapRef.current.on('click', async (e: any) => {
          const { lat: clickLat, lng: clickLon } = e.latlng;
          markerRef.current.setLatLng([clickLat, clickLon]);
          await handleMarkerUpdate(clickLat, clickLon);
        });

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

  // React to external lat/lon changes
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || lat == null || lon == null) return;
    markerRef.current.setLatLng([lat, lon]);
    // do not auto-zoom to avoid fighting the user
  }, [lat, lon]);

  // Watch invalid flag to show/hide popup
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    const w: any = window as any;
    const L = (w && (w as any).L) ? (w as any).L : null;
    if (!L) return;
    if (invalid) {
      const content = `<div style="background:#FEE2E2;color:#991B1B;border:1px solid #EF4444;border-radius:8px;padding:8px 10px;max-width:240px;">
        <strong>Lokasi di luar kawasan Hulu Selangor.</strong>
      </div>`;
      if (popupRef.current) {
        popupRef.current.setContent(content);
        popupRef.current.setLatLng(markerRef.current.getLatLng()).openOn(mapRef.current);
      } else {
        popupRef.current = L.popup({ closeButton: true, autoPan: true })
          .setLatLng(markerRef.current.getLatLng())
          .setContent(content)
          .openOn(mapRef.current);
      }
    } else {
      if (popupRef.current) {
        mapRef.current.closePopup(popupRef.current);
      }
    }
  }, [invalid]);

  return (
    <div>
      {showInstructions && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-800 mb-1">📍 Cara Menggunakan Peta:</p>
          <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
            <li><strong>Klik/Sentuh</strong> pada peta untuk meletakkan pin di lokasi tersebut</li>
            <li><strong>Seret pin</strong> untuk menggerakkan ke lokasi yang tepat</li>
            <li>Gunakan butang <strong>+/-</strong> atau cubit untuk zum masuk/keluar</li>
            <li>Alamat akan diisi secara <strong>berasingan</strong> di ruangan alamat di atas</li>
          </ul>
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          height: height,
          width: '100%',
          borderRadius: 8,
          overflow: 'hidden',
          border: invalid ? '2px solid #EF4444' : '1px solid hsl(var(--border))'
        }}
      />
    </div>
  );
};

export default MapPicker;
