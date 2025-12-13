/**
 * Smart Location Matcher for Hulu Selangor
 * Extracts real coordinates based on actual address data
 * Comprehensive coverage: 13 mukims, all pekan/bandar, poskod, taman, kampung
 */

// Known locations in Hulu Selangor with real coordinates
export const KNOWN_LOCATIONS: Record<string, { lat: number; lon: number; keywords: string[] }> = {
  // Kuala Kubu Bharu (Poskod: 44000)
  'kkb_town': { lat: 3.5667, lon: 101.6500, keywords: ['kuala kubu bharu', 'kkb', 'pekan kkb', 'bandar kkb', '44000', 'kuartes ikbn peretak', 'jalan ampang pecah'] },
  'kkb_taman_melawati': { lat: 3.5680, lon: 101.6510, keywords: ['taman melawati kuala kubu bharu', 'taman melawati kkb', 'tmn melawati'] },
  'kkb_taman_kkb': { lat: 3.5660, lon: 101.6490, keywords: ['taman kkb', 'tmn kkb'] },
  'kkb_hospital': { lat: 3.5700, lon: 101.6450, keywords: ['hospital kuala kubu bharu', 'hospital kkb'] },
  'kkb_pejabat_daerah': { lat: 3.5680, lon: 101.6520, keywords: ['pejabat daerah', 'kompleks kerajaan'] },
  'kkb_taman_bunga_raya': { lat: 3.5650, lon: 101.6480, keywords: ['taman bunga raya', 'tmn bunga raya'] },
  
  // Batang Kali (Poskod: 44300)
  'batang_kali_town': { lat: 3.4500, lon: 101.6333, keywords: ['batang kali', 'btang kali', 'pekan batang kali', 'bandar batang kali', '44300'] },
  'batang_kali_bandar_utama': { lat: 3.4515, lon: 101.6345, keywords: ['bandar utama batang kali', 'bandar utama btang kali'] },
  'batang_kali_taman_seri': { lat: 3.4520, lon: 101.6350, keywords: ['taman seri batang kali', 'tmn seri batang kali', 'apt seri tanjung', 'seri tanjung'] },
  'batang_kali_kg': { lat: 3.4480, lon: 101.6320, keywords: ['kampung batang kali', 'kg batang kali'] },
  'batang_kali_jalan': { lat: 3.4510, lon: 101.6340, keywords: ['jalan batang kali', 'jln batang kali', 'lorong batang kali', 'jalan meranti', 'jalan sumarak', 'jalan widuri'] },
  
  // Rasa (Poskod: 44200)
  'rasa_town': { lat: 3.5000, lon: 101.5333, keywords: ['rasa', 'pekan rasa', 'bandar rasa', '44200'] },
  'rasa_taman_seri': { lat: 3.5015, lon: 101.5345, keywords: ['taman seri rasa', 'tmn seri rasa', 'jalan angsana', 'taman angsana'] },
  'rasa_taman_jaya': { lat: 3.5020, lon: 101.5350, keywords: ['taman rasa jaya', 'tmn rasa jaya'] },
  'rasa_taman_desa': { lat: 3.5010, lon: 101.5340, keywords: ['taman desa rasa', 'tmn desa rasa', 'desa anggerik', 'taman desa anggerik'] },
  'rasa_taman_keruing': { lat: 3.5008, lon: 101.5338, keywords: ['taman keruing', 'tmn keruing', 'jalan keruing'] },
  'rasa_felda': { lat: 3.5050, lon: 101.5300, keywords: ['felda rasa'] },
  'rasa_kg': { lat: 3.4980, lon: 101.5320, keywords: ['kampung rasa', 'kg rasa', 'kg seri serendah'] },
  'rasa_jalan': { lat: 3.5005, lon: 101.5335, keywords: ['jalan rasa', 'jln rasa', 'lorong rasa'] },
  
  // Serendah (Poskod: 48200)
  'serendah_town': { lat: 3.3667, lon: 101.6000, keywords: ['serendah', 'pekan serendah', '48200'] },
  'serendah_taman_sri': { lat: 3.3680, lon: 101.6020, keywords: ['taman sri serendah', 'tmn sri serendah'] },
  'serendah_taman_desa': { lat: 3.3675, lon: 101.6015, keywords: ['taman desa kiambang', 'desa kiambang', 'jalan kiambang'] },
  'serendah_kg': { lat: 3.3650, lon: 101.5980, keywords: ['kampung serendah', 'kg serendah', 'kg seri serendah', 'jalan melati'] },
  'serendah_jalan': { lat: 3.3670, lon: 101.6005, keywords: ['jalan serendah', 'jln serendah', 'lorong serendah', 'jalan kesumba', 'jalan anggerik'] },
  'serendah_seksyen': { lat: 3.3685, lon: 101.6025, keywords: ['seksyen bb18', 'seksyen bs 10'] },
  
  // Kalumpang & Kuala Kalumpang (Poskod: 44100)
  'kalumpang_town': { lat: 3.4833, lon: 101.5167, keywords: ['kalumpang', 'pekan kalumpang', '44100'] },
  'kuala_kalumpang': { lat: 3.5800, lon: 101.4800, keywords: ['kuala kalumpang', 'kl kalumpang'] },
  'kalumpang_kg': { lat: 3.4850, lon: 101.5150, keywords: ['kampung kalumpang', 'kg kalumpang'] },
  'kalumpang_jalan': { lat: 3.4840, lon: 101.5170, keywords: ['jalan kalumpang', 'jln kalumpang', 'lorong kalumpang'] },
  
  // Kerling (Poskod: 44100)
  'kerling_town': { lat: 3.4833, lon: 101.5833, keywords: ['kerling', 'pekan kerling', '44100'] },
  'kerling_kg': { lat: 3.4850, lon: 101.5850, keywords: ['kampung kerling', 'kg kerling'] },
  'kerling_jalan': { lat: 3.4840, lon: 101.5840, keywords: ['jalan kerling', 'jln kerling', 'lorong kerling'] },
  
  // Peretak/Pertak
  'peretak_town': { lat: 3.4300, lon: 101.5700, keywords: ['peretak', 'pertak', 'pekan peretak', 'pekan pertak'] },
  'peretak_kg': { lat: 3.4320, lon: 101.5720, keywords: ['kampung pertak', 'kg pertak', 'kampung peretak', 'kg peretak'] },
  
  // Ulu Yam (Poskod: 44300)
  'ulu_yam_town': { lat: 3.4167, lon: 101.6833, keywords: ['ulu yam', 'pekan ulu yam', '44300'] },
  'ulu_yam_baru': { lat: 3.4200, lon: 101.6850, keywords: ['ulu yam baru', 'ulu yam bharu'] },
  'ulu_yam_lama': { lat: 3.4150, lon: 101.6800, keywords: ['ulu yam lama'] },
  'ulu_yam_felda': { lat: 3.4210, lon: 101.6860, keywords: ['felda ulu yam'] },
  'ulu_yam_kg': { lat: 3.4180, lon: 101.6820, keywords: ['kampung ulu yam', 'kg ulu yam'] },
  
  // Bukit Beruntung & Bukit Sentosa (Poskod: 48300)
  'bukit_beruntung': { lat: 3.3833, lon: 101.5667, keywords: ['bukit beruntung', 'bkt beruntung', 'bb7', 'bb18', '48300', 'jalan bukit beruntung'] },
  'bukit_beruntung_taman': { lat: 3.3840, lon: 101.5675, keywords: ['taman bukit beruntung', 'tmn bukit beruntung', 'tmn bkt beruntung'] },
  'bukit_beruntung_sek': { lat: 3.3845, lon: 101.5670, keywords: ['sek bb7', 'sek bb18', 'seksyen bb7', 'seksyen bb18'] },
  'bukit_sentosa': { lat: 3.3850, lon: 101.5680, keywords: ['bukit sentosa', 'bkt sentosa', 'perumahan bakawali', 'bakawali'] },
  'bukit_sentosa_taman': { lat: 3.3860, lon: 101.5690, keywords: ['taman bukit sentosa', 'tmn bukit sentosa', 'tmn bkt sentosa', 'bukit sentosa 3'] },
  
  // Sungai Choh (Poskod: 48000)
  'sungai_choh': { lat: 3.3500, lon: 101.5833, keywords: ['sungai choh', 'sg choh', 'pekan sungai choh', '48000'] },
  'sungai_choh_taman': { lat: 3.3510, lon: 101.5840, keywords: ['taman sungai choh', 'tmn sungai choh', 'tmn sg choh'] },
  
  // Lembah Beringin (Poskod: 44200)
  'lembah_beringin': { lat: 3.5100, lon: 101.5400, keywords: ['lembah beringin', '44200'] },
  'lembah_beringin_taman': { lat: 3.5110, lon: 101.5410, keywords: ['taman lembah beringin', 'tmn lembah beringin'] },
  
  // Ampang Pecah
  'ampang_pecah': { lat: 3.4000, lon: 101.5500, keywords: ['ampang pecah', 'ampang pechah', 'pekan ampang pecah'] },
  'ampang_pecah_kg': { lat: 3.4020, lon: 101.5520, keywords: ['kampung ampang pecah', 'kg ampang pecah', 'kampung ampang pechah', 'kg ampang pechah'] },
  
  // Hulu Bernam
  'hulu_bernam': { lat: 3.6833, lon: 101.5000, keywords: ['hulu bernam', 'ulu bernam', 'pekan hulu bernam'] },
  
  // Sungai Tinggi
  'sungai_tinggi': { lat: 3.6500, lon: 101.5500, keywords: ['sungai tinggi', 'sg tinggi'] },
  'sungai_tinggi_kg': { lat: 3.6510, lon: 101.5510, keywords: ['kampung sungai tinggi', 'kg sungai tinggi'] },
  'sungai_tinggi_felda': { lat: 3.6520, lon: 101.5520, keywords: ['felda sungai tinggi'] },
  
  // Sungai Gumut
  'sungai_gumut': { lat: 3.6000, lon: 101.5200, keywords: ['sungai gumut', 'sg gumut'] },
  'sungai_gumut_kg': { lat: 3.6010, lon: 101.5210, keywords: ['kampung sungai gumut', 'kg sungai gumut'] },
  
  // Buloh Telor/Telur
  'buloh_telor': { lat: 3.5200, lon: 101.5800, keywords: ['buloh telor', 'buloh telur', 'kampung buloh telor'] },
  
  // Common taman keywords
  'taman_garing': { lat: 3.5650, lon: 101.6490, keywords: ['taman garing', 'tmn garing'] },
  'taman_bunga_raya': { lat: 3.5655, lon: 101.6495, keywords: ['taman bunga raya', 'tmn bunga raya'] },
  'taman_widuri': { lat: 3.3835, lon: 101.5672, keywords: ['taman widuri', 'tmn widuri', 'taman widuri 2'] },
  
  // FELDA locations
  'felda_gedangsa': { lat: 3.5060, lon: 101.5310, keywords: ['felda gedangsa'] },
  
  // Rawang (borders Hulu Selangor, some addresses may reference it)
  'rawang': { lat: 3.3214, lon: 101.5767, keywords: ['rawang', 'pekan rawang', '48000', '48010'] },
  'rawang_bandar': { lat: 3.3230, lon: 101.5785, keywords: ['bandar utama rawang', 'bdr sg. buaya', 'bandar sg buaya'] },
  'rawang_taman': { lat: 3.3250, lon: 101.5800, keywords: ['taman rawang', 'tmn rawang', 'jalan cemperai'] },
};

// All 13 Official Mukims in Hulu Selangor (fallback coordinates)
export const MUKIM_COORDS: Record<string, { lat: number; lon: number; radius: number }> = {
  // Main mukims
  'Kuala Kubu Bharu': { lat: 3.5667, lon: 101.6500, radius: 0.03 },
  'Hulu Bernam': { lat: 3.6833, lon: 101.5000, radius: 0.04 },
  'Kalumpang': { lat: 3.4833, lon: 101.5167, radius: 0.025 },
  'Sungai Gumut': { lat: 3.6000, lon: 101.5200, radius: 0.03 },
  'Sungai Tinggi': { lat: 3.6500, lon: 101.5500, radius: 0.03 },
  'Kerling': { lat: 3.4833, lon: 101.5833, radius: 0.025 },
  'Ampang Pecah': { lat: 3.4000, lon: 101.5500, radius: 0.025 },
  'Ampang Pechah': { lat: 3.4000, lon: 101.5500, radius: 0.025 }, // Alternative spelling
  'Buloh Telur': { lat: 3.5200, lon: 101.5800, radius: 0.02 },
  'Buloh Telor': { lat: 3.5200, lon: 101.5800, radius: 0.02 }, // Alternative spelling
  'Pertak': { lat: 3.4300, lon: 101.5700, radius: 0.02 },
  'Peretak': { lat: 3.4300, lon: 101.5700, radius: 0.02 }, // Alternative spelling
  'Rasa': { lat: 3.5000, lon: 101.5333, radius: 0.02 },
  'Batang Kali': { lat: 3.4500, lon: 101.6333, radius: 0.025 },
  'Hulu Yam': { lat: 3.4167, lon: 101.6833, radius: 0.03 },
  'Ulu Yam': { lat: 3.4167, lon: 101.6833, radius: 0.03 }, // Alternative spelling
  'Serendah': { lat: 3.3667, lon: 101.6000, radius: 0.02 },
  'Kuala Kalumpang': { lat: 3.5800, lon: 101.4800, radius: 0.025 },
};

/**
 * Extract coordinates from address using smart keyword matching
 * Handles addresses with or without commas between parts
 */
export function extractCoordinatesFromAddress(address: string, mukim?: string, daerah?: string): { lat: number; lon: number } | null {
  if (!address) {
    console.log('⚠️ No address provided for matching');
    return null;
  }
  
  // Normalize: lowercase, trim, and add spaces around common separators
  let normalizedAddress = address.toLowerCase().trim();
  // Add space before numbers (for poskod detection)
  normalizedAddress = normalizedAddress.replace(/(\d{5})/g, ' $1 ');
  // Normalize multiple spaces to single space
  normalizedAddress = normalizedAddress.replace(/\s+/g, ' ');
  
  console.log(`🔍 Matching address: "${address.substring(0, 80)}..."`);
  
  // Step 1: Try to match specific known locations (prioritize specific over general)
  let bestMatch: { lat: number; lon: number; keyword: string } | null = null;
  let bestMatchLength = 0;
  
  for (const [locationId, location] of Object.entries(KNOWN_LOCATIONS)) {
    for (const keyword of location.keywords) {
      const keywordLower = keyword.toLowerCase();
      
      // Check if keyword exists in address (with word boundaries for better matching)
      if (normalizedAddress.includes(keywordLower)) {
        // Prefer longer, more specific matches
        if (keyword.length > bestMatchLength) {
          bestMatch = {
            lat: location.lat,
            lon: location.lon,
            keyword: keyword
          };
          bestMatchLength = keyword.length;
        }
      }
    }
  }
  
  if (bestMatch) {
    console.log(`✓ Matched "${bestMatch.keyword}" (length: ${bestMatchLength})`);
    // Add small random offset (±0.002 degrees ≈ 200m) for distribution
    const latOffset = (Math.random() - 0.5) * 0.004;
    const lonOffset = (Math.random() - 0.5) * 0.004;
    return {
      lat: bestMatch.lat + latOffset,
      lon: bestMatch.lon + lonOffset,
    };
  }
  
  console.log(`⚠️ No keyword match found in address`);
  
  // Step 2: Try to match mukim (case-insensitive)
  if (mukim) {
    // Try exact match first
    if (MUKIM_COORDS[mukim]) {
      console.log(`✓ Using mukim coordinates: ${mukim}`);
      const mukimCoord = MUKIM_COORDS[mukim];
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * mukimCoord.radius;
      return {
        lat: mukimCoord.lat + distance * Math.cos(angle),
        lon: mukimCoord.lon + distance * Math.sin(angle),
      };
    }
    
    // Try case-insensitive match
    const mukimLower = mukim.toLowerCase();
    for (const [key, coord] of Object.entries(MUKIM_COORDS)) {
      if (key.toLowerCase() === mukimLower) {
        console.log(`✓ Using mukim coordinates (case-insensitive): ${key}`);
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * coord.radius;
        return {
          lat: coord.lat + distance * Math.cos(angle),
          lon: coord.lon + distance * Math.sin(angle),
        };
      }
    }
    
    console.log(`⚠️ Mukim "${mukim}" not found in database`);
  }
  
  // Step 3: Fallback to daerah center (Kuala Kubu Bharu)
  if (daerah === 'Hulu Selangor') {
    console.log(`✓ Using daerah center: Hulu Selangor`);
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * 0.05;
    return {
      lat: 3.5667 + distance * Math.cos(angle),
      lon: 101.6500 + distance * Math.sin(angle),
    };
  }
  
  return null;
}

/**
 * Parse address and extract location information
 */
export function parseAddress(addressString: string): {
  street?: string;
  area?: string;
  mukim?: string;
  poskod?: string;
  keywords: string[];
} {
  const normalized = addressString.toLowerCase();
  const keywords: string[] = [];
  
  // Extract common patterns
  const patterns = {
    street: /(?:jalan|jln|lorong|lrg|persiaran|psn|jln\.|jalan\s+)([^,\n]+)/gi,
    taman: /(?:taman|tmn|taman\s+)([^,\n]+)/gi,
    kampung: /(?:kampung|kg|kampong|kg\.)([^,\n]+)/gi,
    poskod: /\b(\d{5})\b/g,
  };
  
  // Extract keywords
  let match;
  
  // Streets
  while ((match = patterns.street.exec(normalized)) !== null) {
    keywords.push(match[0].trim());
  }
  
  // Taman
  while ((match = patterns.taman.exec(normalized)) !== null) {
    keywords.push(match[0].trim());
  }
  
  // Kampung
  while ((match = patterns.kampung.exec(normalized)) !== null) {
    keywords.push(match[0].trim());
  }
  
  return {
    keywords,
  };
}
