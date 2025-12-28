import { supabase } from '../supabase';

// Increment visitor count
export async function incrementVisitorCount(): Promise<number> {
  const { data, error } = await supabase.rpc('increment_visitor_count');
  
  if (error) {
    console.error('Error incrementing visitor count:', error);
    throw error;
  }
  
  return data as number;
}

// Get current visitor count
export async function getVisitorCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_visitor_count');
  
  if (error) {
    console.error('Error getting visitor count:', error);
    throw error;
  }
  
  return data as number;
}
