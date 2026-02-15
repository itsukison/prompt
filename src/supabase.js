const { createClient } = require('@supabase/supabase-js');

let supabaseClient = null;
let store = null;

/**
 * Initialize electron-store (ESM module requires dynamic import)
 */
async function initStore() {
    if (store) return store;
    const Store = (await import('electron-store')).default;
    store = new Store({ name: 'promptos-auth' });
    return store;
}

/**
 * Create and return a Supabase client configured for Electron
 * Uses electron-store for session persistence
 */
async function createSupabaseClient() {
    if (supabaseClient) {
        return supabaseClient;
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
        return null;
    }

    // Initialize store
    await initStore();

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            storage: {
                getItem: (key) => {
                    const value = store.get(key);
                    return value ?? null;
                },
                setItem: (key, value) => {
                    store.set(key, value);
                },
                removeItem: (key) => {
                    store.delete(key);
                },
            },
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
        },
    });

    console.log('[Supabase] Client initialized');
    return supabaseClient;
}

/**
 * Get the current Supabase client instance
 */
function getSupabaseClient() {
    return supabaseClient;
}

/**
 * Clear stored auth session
 */
async function clearAuthSession() {
    if (!store) {
        await initStore();
    }
    store.clear();
    console.log('[Supabase] Auth session cleared');
}

module.exports = {
    createSupabaseClient,
    getSupabaseClient,
    clearAuthSession,
};
