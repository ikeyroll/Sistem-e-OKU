import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export interface Application {
  id: string;
  ref_no?: string;
  no_siri?: string;
  application_type: 'baru' | 'pembaharuan';
  pemohon: {
    name: string;
    ic: string;
    okuCard: string;
    phone: string;
    carReg: string;
    okuCategory: string;
    address: {
      street: string;
      mukim: string;
      daerah: string;
      poskod?: string;
      negeri?: string;
      full_address?: string; // Combined address for display
    };
    taxAccount?: string;
  };
  tanggungan?: {
    name: string;
    relation: string;
    ic: string;
    company?: string;
  };
  documents: {
    icCopy: string;
    okuCard: string;
    drivingLicense: string;
    passportPhoto: string;
    tanggunganSignature?: string;
  };
  status: 'Dalam Proses' | 'Diluluskan' | 'Sedia Diambil' | 'Telah Diambil' | 'Tidak Berjaya';
  admin_notes?: string;
  submitted_date: string;
  approved_date?: string;
  expiry_date?: string;
  ready_date?: string;
  collected_date?: string;
  created_at: string;
  updated_at: string;
  // Geospatial fields
  latitude?: number;
  longitude?: number;
  daerah?: string;
  mukim?: string;
  // Generated KML URL (if stored)
  kml_url?: string;
}