// Lightweight Supabase client helper (uses service role key for admin tasks)
// Usage in scripts (server-side): set process.env.SUPABASE_SERVICE_ROLE_KEY
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
    console.warn('SUPABASE_URL not set in env (REACT_APP_SUPABASE_URL or SUPABASE_URL)');
}
if (!SERVICE_ROLE_KEY) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set in env (SUPABASE_SERVICE_ROLE_KEY)');
}

export function getSupabaseAdmin() {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        throw new Error('Supabase admin credentials not configured in env');
    }
    return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
        global: { headers: { 'x-should-revalidate': 'false' } }
    });
}

export default getSupabaseAdmin;
