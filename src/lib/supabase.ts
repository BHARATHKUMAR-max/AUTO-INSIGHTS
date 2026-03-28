import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Singleton instance to prevent multiple lock requests
// We use sessionStorage to avoid cross-tab lock contention in iframes
console.log('Initializing Supabase client with sessionStorage and default locking...');
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'auto-insights-auth-v9',
    // Use sessionStorage to prevent cross-tab/iframe lock issues
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    // Disable locking mechanism to avoid "Lock broken" errors in iframe/strict-mode
    lock: async (name, acquireTimeout, fn) => {
      // No-op lock: just execute the function immediately without waiting or stealing
      return await fn();
    }
  }
});
