import { supabase } from '../supabase';

export interface SessionSetting {
  year: number;
  capacity: number;
  prefix?: string;
  updated_at?: string;
}

const DEFAULT_CAPACITY = 350;

export async function getSessionCapacity(year: number): Promise<number> {
  const { data, error } = await supabase
    .from('session_settings')
    .select('capacity')
    .eq('year', year)
    .single();

  if (error) {
    // If table missing or row not found, fall back to default
    return DEFAULT_CAPACITY;
  }

  return data?.capacity ?? DEFAULT_CAPACITY;
}

export async function setSessionCapacity(year: number, capacity: number): Promise<void> {
  // Upsert capacity for the given year
  const { error } = await supabase
    .from('session_settings')
    .upsert({ year, capacity, updated_at: new Date().toISOString() }, { onConflict: 'year' });

  if (error) throw error;
}

export async function getSessionPrefix(year: number): Promise<string> {
  const { data, error } = await supabase
    .from('session_settings')
    .select('prefix')
    .eq('year', year)
    .single();

  if (error || !data?.prefix) {
    return 'MPHS'; // Default prefix
  }

  return data.prefix;
}

export async function setSessionConfig(year: number, capacity: number, prefix: string): Promise<void> {
  // Upsert capacity and prefix for the given year
  const { error } = await supabase
    .from('session_settings')
    .upsert({ year, capacity, prefix: prefix.toUpperCase(), updated_at: new Date().toISOString() }, { onConflict: 'year' });

  if (error) throw error;
}

export async function getIssuedCount(year: number): Promise<number> {
  // Count approved applications with no_siri in that calendar year
  const start = new Date(year, 0, 1).toISOString();
  const end = new Date(year, 11, 31, 23, 59, 59, 999).toISOString();

  const { count, error } = await supabase
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .not('no_siri', 'is', null)
    .gte('approved_date', start)
    .lte('approved_date', end);

  if (error) throw error;
  return count || 0;
}
