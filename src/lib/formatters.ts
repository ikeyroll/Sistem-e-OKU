/**
 * Format IC number with dashes (XXXXXX-XX-XXXX)
 * Handles IC numbers with or without dashes
 */
export function formatIC(ic: string | undefined | null): string {
  if (!ic) return '-';
  
  // Remove all non-digit characters
  const cleanIC = ic.replace(/\D/g, '');
  
  // If not 12 digits, return as is
  if (cleanIC.length !== 12) return ic;
  
  // Format as XXXXXX-XX-XXXX
  return `${cleanIC.slice(0, 6)}-${cleanIC.slice(6, 8)}-${cleanIC.slice(8, 12)}`;
}

/**
 * Format phone number for display
 */
export function formatPhone(phone: string | undefined | null): string {
  if (!phone) return '-';
  return phone;
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '-';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('ms-MY');
  } catch {
    return '-';
  }
}
