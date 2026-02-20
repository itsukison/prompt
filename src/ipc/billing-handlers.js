const { ipcMain, shell } = require('electron');
const { ok, fail } = require('../utils/ipc-response');

/**
 * @param {object} deps - { supabase, getAppState }
 */
function setupBillingHandlers({ supabase, getAppState }) {
    const supabaseUrl = process.env.SUPABASE_URL
        || 'https://fedzebrojuvixsiajjef.supabase.co';

    ipcMain.handle('billing:create-portal', async () => {
        try {
            console.log('[Billing] create-portal');

            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) return fail('Session error: ' + sessionError.message);
            if (!session) return fail('Not authenticated');

            const url = `${supabaseUrl}/functions/v1/create-portal-session`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });

            let data;
            const rawText = await response.text();
            try { data = JSON.parse(rawText); } catch {
                console.error('[Billing] Portal response not JSON:', rawText);
                return fail('Unexpected response from server');
            }

            if (!response.ok || !data.url) {
                return fail(data.error || data.message || 'Failed to create portal session');
            }

            await shell.openExternal(data.url);
            return ok({ url: data.url });
        } catch (err) {
            console.error('[Billing] create-portal unexpected error:', err);
            return fail(err.message);
        }
    });

    ipcMain.handle('billing:create-checkout', async (event, { priceId }) => {
        try {
            console.log('[Billing] create-checkout: priceId =', priceId);

            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) {
                console.error('[Billing] getSession error:', sessionError.message);
                return fail('Session error: ' + sessionError.message);
            }
            if (!session) {
                console.error('[Billing] No active session');
                return fail('Not authenticated');
            }
            console.log('[Billing] Session OK, user:', session.user.id, '| token expires_at:', session.expires_at);

            const url = `${supabaseUrl}/functions/v1/create-checkout-session`;
            console.log('[Billing] Calling Edge Function:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ priceId }),
            });

            console.log('[Billing] Edge Function response status:', response.status);

            let data;
            const rawText = await response.text();
            try {
                data = JSON.parse(rawText);
            } catch {
                console.error('[Billing] Edge Function response is not JSON:', rawText);
                return fail('Unexpected response from server');
            }

            console.log('[Billing] Edge Function response body:', JSON.stringify(data));

            if (!response.ok || !data.url) {
                return fail(data.error || data.message || 'Failed to create checkout session');
            }

            await shell.openExternal(data.url);
            return ok({ url: data.url });
        } catch (err) {
            console.error('[Billing] create-checkout unexpected error:', err);
            return fail(err.message);
        }
    });
}

module.exports = { setupBillingHandlers };
