import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Fallback langsung jika import.meta.env kosong di preview Google AI Studio
const FALLBACK_SUPABASE_URL = 'https://pjraxjecteybnqjozhdz.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqcmF4amVjdGV5Ym5xam96aGR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4MDQ3NDIsImV4cCI6MjExMDM4MDc0Mn0.ktyBA0rlVD9wL-zZpMfaQmItr9YHwZWurzuiJZcy91E';

const envSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const envSupabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

const isPlaceholderValue = (val: string): boolean => {
  if (!val) return true;
  const upper = val.toUpperCase();
  return (
    upper.includes('YOUR_PROJECT_ID') ||
    upper.includes('YOUR_SUPABASE_ANON') ||
    upper.includes('TEMPEL_') ||
    upper.includes('[') ||
    upper.includes(']') ||
    upper === 'MY_SUPABASE_URL' ||
    upper === 'MY_SUPABASE_ANON_KEY'
  );
};

const resolvedSupabaseUrl = !isPlaceholderValue(envSupabaseUrl)
  ? envSupabaseUrl
  : FALLBACK_SUPABASE_URL.trim();

const resolvedSupabaseAnonKey = !isPlaceholderValue(envSupabaseAnonKey)
  ? envSupabaseAnonKey
  : FALLBACK_SUPABASE_ANON_KEY.trim();

export const isSupabaseConfigured: boolean =
  Boolean(resolvedSupabaseUrl) &&
  Boolean(resolvedSupabaseAnonKey) &&
  !isPlaceholderValue(resolvedSupabaseUrl) &&
  !isPlaceholderValue(resolvedSupabaseAnonKey) &&
  /^https?:\/\//i.test(resolvedSupabaseUrl);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;

export const SUPABASE_SETUP_GUIDE_TEXT =
  'Kredensial Supabase belum terisi. Silakan ganti placeholder [TEMPEL_SUPABASE_URL_ANDA_DI_SINI] dan [TEMPEL_SUPABASE_ANON_KEY_ANDA_DI_SINI] pada supabaseClient.ts atau isi Secrets VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.';
