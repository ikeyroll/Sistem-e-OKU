/**
 * Update OKU Category Utility
 * Updates all records with okuCategory "2024/2025" to "Lain-lain"
 */

import { supabase } from '../supabase';

export async function updateOkuCategoryFromSessionToLainLain(): Promise<{
  success: boolean;
  updated: number;
  error?: string;
}> {
  try {
    console.log('🔄 Starting update of okuCategory from "2024/2025" to "Lain-lain"...');
    
    // Fetch all applications
    const { data: applications, error: fetchError } = await supabase
      .from('applications')
      .select('id, ref_no, pemohon');
    
    if (fetchError) {
      console.error('❌ Error fetching applications:', fetchError);
      return { success: false, updated: 0, error: fetchError.message };
    }
    
    if (!applications || applications.length === 0) {
      console.log('ℹ️ No applications found');
      return { success: true, updated: 0 };
    }
    
    console.log(`📊 Found ${applications.length} applications to check`);
    
    let updatedCount = 0;
    const updatePromises = [];
    
    for (const app of applications) {
      try {
        // Parse pemohon if it's a string
        const pemohon = typeof app.pemohon === 'string' 
          ? JSON.parse(app.pemohon) 
          : app.pemohon;
        
        // Check if okuCategory is "2024/2025" or similar session format
        if (pemohon?.okuCategory && 
            (pemohon.okuCategory === '2024/2025' || 
             pemohon.okuCategory.match(/^\d{4}\/\d{4}$/))) {
          
          console.log(`  📝 Updating ${app.ref_no}: "${pemohon.okuCategory}" → "Lain-lain"`);
          
          // Update the okuCategory
          pemohon.okuCategory = 'Lain-lain';
          
          // Update in database
          const updatePromise = supabase
            .from('applications')
            .update({ pemohon })
            .eq('id', app.id);
          
          updatePromises.push(updatePromise);
          updatedCount++;
        }
      } catch (parseError) {
        console.warn(`⚠️ Error processing ${app.ref_no}:`, parseError);
      }
    }
    
    // Execute all updates
    if (updatePromises.length > 0) {
      console.log(`\n🚀 Executing ${updatePromises.length} updates...`);
      await Promise.all(updatePromises);
      console.log(`✅ Successfully updated ${updatedCount} records`);
    } else {
      console.log('ℹ️ No records needed updating');
    }
    
    return { success: true, updated: updatedCount };
    
  } catch (error) {
    console.error('❌ Error updating okuCategory:', error);
    return { 
      success: false, 
      updated: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Alternative: SQL-based update (more efficient for large datasets)
export function generateUpdateSQL(): string {
  return `
-- Update all records where okuCategory matches session format (YYYY/YYYY)
UPDATE applications
SET pemohon = jsonb_set(
  pemohon::jsonb,
  '{okuCategory}',
  '"Lain-lain"'
)
WHERE pemohon::jsonb->>'okuCategory' ~ '^[0-9]{4}/[0-9]{4}$';

-- Verify the update
SELECT 
  ref_no,
  pemohon->>'name' as nama,
  pemohon->>'okuCategory' as kategori_oku
FROM applications
WHERE pemohon->>'okuCategory' = 'Lain-lain'
LIMIT 10;
`;
}
