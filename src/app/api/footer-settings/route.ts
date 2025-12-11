import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Retrieve footer settings
export async function GET() {
  try {
    console.log('🔍 Fetching footer settings...');
    const { data, error } = await supabase
      .from('footer_settings')
      .select('*')
      .single();

    console.log('📊 Footer settings query result:', { data, error });

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching footer settings:', error);
      throw error;
    }

    // If no settings exist, return defaults
    if (!data) {
      console.log('⚠️ No footer settings found, returning defaults');
      return NextResponse.json({
        facebook_link: '',
        instagram_link: '',
        youtube_link: '',
        tiktok_link: '',
        whatsapp_link: '',
        asset_number: '1029392',
      });
    }

    console.log('✅ Footer settings loaded successfully:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error fetching footer settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch footer settings' },
      { status: 500 }
    );
  }
}

// POST - Update footer settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      facebook_link,
      instagram_link,
      youtube_link,
      tiktok_link,
      whatsapp_link,
      asset_number,
    } = body;

    console.log('💾 Saving footer settings:', body);

    // Get all settings (in case there are multiple rows)
    const { data: allSettings, error: checkError } = await supabase
      .from('footer_settings')
      .select('id')
      .limit(1);

    console.log('🔍 Existing settings check:', { allSettings, checkError });

    let result;
    if (allSettings && allSettings.length > 0) {
      // Update the first row (there should only be one)
      const existingId = allSettings[0].id;
      console.log('📝 Updating existing settings with ID:', existingId);
      result = await supabase
        .from('footer_settings')
        .update({
          facebook_link,
          instagram_link,
          youtube_link,
          tiktok_link,
          whatsapp_link,
          asset_number,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingId)
        .select();
      
      console.log('✅ Update result:', result);
    } else {
      // Insert new settings (only if table is completely empty)
      console.log('➕ Inserting new settings');
      result = await supabase
        .from('footer_settings')
        .insert({
          facebook_link,
          instagram_link,
          youtube_link,
          tiktok_link,
          whatsapp_link,
          asset_number,
        })
        .select();
      
      console.log('✅ Insert result:', result);
    }

    if (result.error) {
      console.error('❌ Database error:', result.error);
      throw result.error;
    }

    console.log('🎉 Footer settings saved successfully!');
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('❌ Error saving footer settings:', error);
    return NextResponse.json(
      { error: 'Failed to save footer settings', details: error },
      { status: 500 }
    );
  }
}
