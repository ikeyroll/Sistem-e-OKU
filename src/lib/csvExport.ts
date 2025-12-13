/**
 * CSV Export Utility
 * Export applications data to CSV format
 */

import type { Application } from './supabase';

export function exportToCSV(applications: Application[], filename?: string): void {
  // Create CSV header (all butiran pemohon + status/tarikh/sesi)
  const headers = [
    'No. Id',
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
    'Sesi',
  ];

  // Convert applications to CSV rows
  const rows = applications.map(app => {
    // Parse pemohon if it's a string
    const pemohon = typeof app.pemohon === 'string' ? JSON.parse(app.pemohon) : app.pemohon;
    
    // Extract address from JSONB structure
    let fullAddress = '';
    if (pemohon?.address) {
      const addr = pemohon.address;
      const parts = [
        addr.street || pemohon.street || pemohon.alamat,
        addr.mukim || pemohon.mukim,
        addr.daerah || pemohon.daerah,
        addr.poskod || pemohon.poskod,
        addr.negeri || pemohon.negeri || 'Selangor'
      ].filter(p => p);
      fullAddress = parts.join(', ');
    } else if (pemohon?.street || pemohon?.alamat) {
      const parts = [
        pemohon.street || pemohon.alamat,
        pemohon.mukim,
        pemohon.daerah,
        pemohon.poskod,
        pemohon.negeri || 'Selangor'
      ].filter(p => p);
      fullAddress = parts.join(', ');
    }
    
    // Use submitted_date for session calculation, fallback to approved_date or created_at
    const dateForSession = app.submitted_date || app.approved_date || (app as any).created_at;
    const session = getSession(dateForSession || null);
    
    return [
      app.ref_no,
      app.no_siri || '-',
      app.application_type === 'baru' ? 'Baharu' : 'Pembaharuan',
      pemohon.ic || '-',
      pemohon.name || '-',
      pemohon.okuCard || '-',
      pemohon.phone || '-',
      pemohon.carReg || '-',
      pemohon.okuCategory || '-',
      pemohon.taxAccount || '-',
      fullAddress || '-',
      normalizeStatus(app.status),
      app.submitted_date ? formatDate(app.submitted_date) : '-',
      app.approved_date ? formatDate(app.approved_date) : '-',
      app.expiry_date ? formatDate(app.expiry_date) : '-',
      session || '-',
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Add BOM for Excel compatibility with UTF-8
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename || generateFilename());
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('ms-MY', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function generateFilename(): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  return `permohonan_oku_${dateStr}.csv`;
}

function getSession(approvedDate: string | null): string {
  if (!approvedDate) return '';
  try {
    const year = new Date(approvedDate).getFullYear();
    return `${year}/${year + 2}`;
  } catch {
    return '';
  }
}

function normalizeStatus(status: string): string {
  // Map legacy 'Tidak Berjaya' to 'Tidak Lengkap' for consistency
  return status === 'Tidak Berjaya' ? 'Tidak Lengkap' : status;
}

export function exportWithDateRange(
  applications: Application[],
  dateFrom: Date,
  dateTo: Date
): void {
  // Filter applications by date range
  const filtered = applications.filter(app => {
    const submittedDate = new Date(app.submitted_date);
    if (!(submittedDate >= dateFrom && submittedDate <= dateTo)) return false;
    // Exclude not-complete statuses
    const status = normalizeStatus(app.status);
    if (status === 'Tidak Lengkap') return false;
    return true;
  });

  // Generate filename with date range
  const fromStr = formatDate(dateFrom).replace(/\//g, '-');
  const toStr = formatDate(dateTo).replace(/\//g, '-');
  const filename = `permohonan_oku_${fromStr}_${toStr}.csv`;

  exportToCSV(filtered, filename);
}

export function exportBySession(
  applications: Application[],
  session: string
): void {
  // Filter applications by session
  const filtered = applications.filter(app => {
    // Exclude not-complete statuses
    const status = normalizeStatus(app.status);
    if (status === 'Tidak Lengkap') return false;
    
    // Filter by session if specified
    if (session !== 'all') {
      // Use submitted_date to determine session (year of submission)
      const dateToUse = app.submitted_date || app.approved_date || (app as any).created_at;
      const appSession = getSession(dateToUse);
      if (appSession !== session) return false;
    }
    
    return true;
  });

  // Generate filename with session
  const sessionStr = session !== 'all' ? `_sesi_${session.replace('/', '-')}` : '';
  const filename = `permohonan_oku${sessionStr}_${new Date().toISOString().split('T')[0]}.csv`;

  exportToCSV(filtered, filename);
}

// Example usage:
// exportToCSV(applications);
// exportWithDateRange(applications, new Date('2025-01-01'), new Date('2025-01-31'));
