import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getApplications } from '@/lib/api/applications';
import { generateKML } from '@/lib/kml';

export async function GET() {
  try {
    const apps = await getApplications();
    const kml = generateKML(apps);

    const now = new Date();
    const ts = now.toISOString().replace(/[:.]/g, '-');
    const path = `mphs-oku-${ts}.kml`;

    const file = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });

    // Ensure you have a Supabase Storage bucket named 'kml'
    const { error: uploadError } = await supabase.storage
      .from('kml')
      .upload(path, file, {
        cacheControl: '60',
        upsert: true,
        contentType: 'application/vnd.google-earth.kml+xml',
      });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('kml').getPublicUrl(path);

    return NextResponse.json({ ok: true, count: apps.length, url: urlData.publicUrl, path });
  } catch (err: any) {
    console.error('KML generation error', err);
    return NextResponse.json({ ok: false, error: err.message || 'Unknown error' }, { status: 500 });
  }
}
