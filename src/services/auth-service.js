/**
 * Load a user profile from Supabase by user ID
 * @param {object} supabase
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
async function loadUserProfile(supabase, userId) {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('[Auth] Failed to load profile:', error.message);
        return null;
    }
    return data;
}

module.exports = { loadUserProfile };
