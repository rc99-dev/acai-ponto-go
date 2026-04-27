import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://yikxwhqvmkroooyttrxf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlpa3h3aHF2bWtyb29veXR0cnhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMTM1MDQsImV4cCI6MjA5Mjg4OTUwNH0.Qa5TnQ_QLdBrC1xYopTtCdbILw_45vqhxhqiOOFKYqI";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  }
});
