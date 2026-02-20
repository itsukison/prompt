const { ipcMain } = require('electron');
const { ok, fail } = require('../utils/ipc-response');

/**
 * @param {object} deps - { supabase }
 */
function setupUsageHandlers({ supabase }) {
    ipcMain.handle('usage:get-stats', async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return fail('Not authenticated');

            const { data, error } = await supabase
                .from('user_profiles')
                .select('tokens_used, tokens_remaining, subscription_tier, generations_used, generations_limit, subscription_status, subscription_interval, cancel_at_period_end, current_period_end')
                .eq('id', user.id)
                .single();

            if (error) return fail(error.message);
            return ok({ stats: data });
        } catch (err) {
            return fail(err.message);
        }
    });
}

module.exports = { setupUsageHandlers };
