/**
 * KML Export Utility
 * Generate KML file for Google Earth/Maps from application data
 */

import type { Application } from './supabase';

export function generateKML(applications: Application[]): string {
  // Filter applications with valid coordinates
  const appsWithCoords = applications.filter(app => 
    app.latitude && app.longitude &&
    !isNaN(Number(app.latitude)) && !isNaN(Number(app.longitude))
  );

  const placemarks = appsWithCoords.map(app => {
    // Parse pemohon if it's a string
    const pemohon = typeof app.pemohon === 'string' ? JSON.parse(app.pemohon) : app.pemohon;
    
    const name = pemohon?.name || app.ref_no;
    const okuCategory = pemohon?.okuCategory || 'N/A';
    const status = app.status || 'N/A';
    const aktivStatus = status === 'Telah Diambil' ? 'Aktif' : 'Tidak Aktif';
    const address = pemohon?.address?.street || 'N/A';
    const mukim = app.mukim || pemohon?.address?.mukim || 'N/A';
    const daerah = app.daerah || pemohon?.address?.daerah || 'Hulu Selangor';
    
    // Color based on status
    let color = 'ff0000ff'; // Red for default
    if (status === 'Diluluskan' || status === 'Sedia Diambil' || status === 'Telah Diambil') {
      color = 'ff00ff00'; // Green for successful
    } else if (status === 'Dalam Proses') {
      color = 'ff00ffff'; // Yellow for in progress
    }
    
    return `
    <Placemark>
      <name>${escapeXml(name)}</name>
      <description><![CDATA[
        <b>No. Rujukan:</b> ${escapeXml(app.ref_no)}<br/>
        <b>Status Permohonan:</b> ${escapeXml(status)}<br/>
        <b>Status Aktif:</b> ${escapeXml(aktivStatus)}<br/>
        <b>Kategori OKU:</b> ${escapeXml(okuCategory)}<br/>
        <b>Alamat:</b> ${escapeXml(address)}<br/>
        <b>Mukim:</b> ${escapeXml(mukim)}<br/>
        <b>Daerah:</b> ${escapeXml(daerah)}<br/>
      ]]></description>
      <styleUrl>#icon-${status === 'Diluluskan' || status === 'Sedia Diambil' || status === 'Telah Diambil' ? 'success' : status === 'Dalam Proses' ? 'pending' : 'incomplete'}</styleUrl>
      <Point>
        <coordinates>${app.longitude},${app.latitude},0</coordinates>
      </Point>
    </Placemark>`;
  }).join('\n');

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Taburan Permohonan e-OKU MPHS</name>
    <description>Taburan permohonan pelekat kenderaan OKU - Majlis Perbandaran Hulu Selangor</description>
    
    <!-- Styles -->
    <Style id="icon-success">
      <IconStyle>
        <color>ff00ff00</color>
        <scale>1.0</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/grn-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    
    <Style id="icon-pending">
      <IconStyle>
        <color>ff00ffff</color>
        <scale>1.0</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/ylw-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    
    <Style id="icon-incomplete">
      <IconStyle>
        <color>ff0000ff</color>
        <scale>1.0</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    
    <!-- Placemarks -->
    ${placemarks}
    
  </Document>
</kml>`;

  return kml;
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function downloadKML(applications: Application[], filename: string = 'taburan-oku-mphs.kml') {
  const kmlContent = generateKML(applications);
  const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
