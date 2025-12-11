/**
 * Generate No Siri for approved applications
 * Format: MPHS/YYYY/NNN
 * Example: MPHS/2026/001
 */

interface Application {
  noSiri?: string;
  approvedDate?: Date;
}

export async function generateNoSiri(year: number): Promise<string> {
  // Get last approved application for the year
  const lastSequence = await getLastSequenceNumber(year);
  
  const newSequence = lastSequence + 1;
  
  // Maximum 350 applications per year
  if (newSequence > 350) {
    throw new Error(`Bilangan maksimum permohonan untuk tahun ${year} telah dicapai (350)`);
  }
  
  // Format: MPHS/YYYY/NNN
  return `MPHS/${year}/${newSequence.toString().padStart(3, '0')}`;
}

async function getLastSequenceNumber(year: number): Promise<number> {
  // Mock implementation
  // In real app, query database for last approved application of the year
  
  // Example query:
  // const lastApp = await db.applications.findFirst({
  //   where: {
  //     year: year,
  //     status: 'Approved',
  //     noSiri: { not: null }
  //   },
  //   orderBy: { noSiri: 'desc' }
  // });
  
  // if (!lastApp?.noSiri) return 0;
  
  // Extract sequence number from noSiri (MPHS/2026/001 -> 001)
  // const sequence = parseInt(lastApp.noSiri.split('/')[2]);
  // return sequence;
  
  // Mock: Return 0 for now (will start from 001)
  return 0;
}

export function parseNoSiri(noSiri: string): { year: number; sequence: number } | null {
  // Parse MPHS/2026/001 format
  const parts = noSiri.split('/');
  
  if (parts.length !== 3 || parts[0] !== 'MPHS') {
    return null;
  }
  
  const year = parseInt(parts[1]);
  const sequence = parseInt(parts[2]);
  
  if (isNaN(year) || isNaN(sequence)) {
    return null;
  }
  
  return { year, sequence };
}

export function validateNoSiri(noSiri: string): boolean {
  const parsed = parseNoSiri(noSiri);
  
  if (!parsed) return false;
  
  // Check year is reasonable (2020-2100)
  if (parsed.year < 2020 || parsed.year > 2100) return false;
  
  // Check sequence is within range (1-350)
  if (parsed.sequence < 1 || parsed.sequence > 350) return false;
  
  return true;
}

// Example usage:
// const noSiri = await generateNoSiri(2026);
// console.log(noSiri); // MPHS/2026/001
