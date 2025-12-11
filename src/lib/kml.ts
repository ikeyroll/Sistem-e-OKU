import type { Application } from './supabase';

function escapeXml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateKML(apps: Application[]): string {
  const header = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n  <name>MPHS OKU Applications</name>`;
  const footer = `\n</Document>\n</kml>`;

  // Group by daerah -> mukim
  const byDaerah = new Map<string, Application[]>();
  for (const app of apps) {
    const pemohon = typeof app.pemohon === 'string' ? JSON.parse(app.pemohon as unknown as string) : app.pemohon;
    
    // Resolve coordinates
    const lat = app.latitude ?? pemohon?.latitude;
    const lon = app.longitude ?? pemohon?.longitude;
    
    if (lat == null || lon == null) continue;
    
    // Resolve location names
    let daerah = app.daerah ?? pemohon?.daerah ?? (typeof pemohon?.address === 'object' ? pemohon?.address?.daerah : undefined) ?? 'Tidak Ditetapkan';
    let mukim = app.mukim ?? pemohon?.mukim ?? (typeof pemohon?.address === 'object' ? pemohon?.address?.mukim : undefined) ?? 'Tidak Ditetapkan';
    
    const key = daerah + '|' + mukim;
    const list = byDaerah.get(key) || [];
    list.push(app);
    byDaerah.set(key, list);
  }

  let body = '';
  for (const [key, list] of byDaerah.entries()) {
    const [daerah, mukim] = key.split('|');
    const folderName = `${daerah} - ${mukim}`;
    body += `\n  <Folder>\n    <name>${escapeXml(folderName)}</name>`;
    for (const app of list) {
      const pemohon = typeof app.pemohon === 'string' ? JSON.parse(app.pemohon as unknown as string) : app.pemohon;
      const lat = app.latitude ?? pemohon?.latitude;
      const lon = app.longitude ?? pemohon?.longitude;
      
      const title = `${app.ref_no} - ${pemohon?.name || ''}`;
      // Handle address display
      let displayAddress = '';
      if (typeof pemohon?.address === 'object') {
        displayAddress = pemohon.address.full_address || 
          [pemohon.address.street, pemohon.address.mukim, pemohon.address.daerah].filter(Boolean).join(', ');
      } else {
        displayAddress = pemohon?.address || '';
      }
      
      const desc = `Jenis: ${app.application_type}\nIC: ${pemohon?.ic || ''}\nAlamat: ${displayAddress}`;
      body += `\n    <Placemark>\n      <name>${escapeXml(title)}</name>\n      <description>${escapeXml(desc)}</description>\n      <Point>\n        <coordinates>${lon},${lat},0</coordinates>\n      </Point>\n    </Placemark>`;
    }
    body += `\n  </Folder>`;
  }

  return header + body + footer;
}
