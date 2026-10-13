import { createBrowserClient } from '@supabase/ssr';

function cleanSupabaseUrl(url?: string): string {
  if (!url) return 'https://mock.supabase.co';
  let cleaned = url.trim();
  cleaned = cleaned.replace(/\/+$/, '');
  cleaned = cleaned.replace(/\/rest\/v1\/?$/, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

export function createClient() {
  const supabaseUrl = cleanSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key').trim();
  
  return createBrowserClient(supabaseUrl, supabaseKey);
}
