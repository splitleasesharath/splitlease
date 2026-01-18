import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Process any pending OAuth login callback immediately
// This runs when the supabase module is first imported (early in app lifecycle)
// Using dynamic import to avoid circular dependency (oauthCallbackHandler imports auth.js which imports supabase.js)
// Result is fire-and-forget - the Header's onAuthStateChange will handle UI updates
import('./oauthCallbackHandler.js').then(({ processOAuthLoginCallback }) => {
  processOAuthLoginCallback().then(result => {
    if (result.processed) {
      console.log('[Supabase Init] OAuth callback processed:', result.success ? 'success' : 'failed');
    }
  }).catch(err => {
    console.error('[Supabase Init] OAuth callback error:', err);
  });
});
