import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://imvzouwulwpfbemunhbl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltdnpvdXd1bHdwZmJlbXVuaGJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMTE2MjYsImV4cCI6MjA5Mjg4NzYyNn0.IGfleoWBmrJS4dirQqIaloZG4uXvvAwh2vWJj5mDJ2w";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  }
});
