const { ipcMain } = require('electron');
const { ok, fail } = require('../utils/ipc-response');

/**
 * @param {object} deps - { supabase, getAppState, transitionToOverlayMode, transitionToAuthMode }
 */
function setupAuthHandlers({ supabase, getAppState, transitionToAuthMode }) {
    ipcMain.handle('auth:sign-up', async (event, { email, password }) => {
        try {
            const { data, error } = await supabase.auth.signUp({ email, password });
            if (error) return fail(error.message);
            return ok({ user: data.user });
        } catch (err) {
            return fail(err.message);
        }
    });

    ipcMain.handle('auth:sign-in', async (event, { email, password }) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) return fail(error.message);

            const { loadUserProfile } = require('../services/auth-service');
            const profile = await loadUserProfile(supabase, data.user.id);
            if (profile) getAppState().currentUserProfile = profile;

            return ok({ user: data.user, profile, needsOnboarding: !profile?.onboarding_completed });
        } catch (err) {
            return fail(err.message);
        }
    });

    ipcMain.handle('auth:sign-out', async () => {
        try {
            await supabase.auth.signOut();
            await transitionToAuthMode();
            return ok();
        } catch (err) {
            return fail(err.message);
        }
    });

    ipcMain.handle('auth:get-session', async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            return ok({ session });
        } catch (err) {
            return fail(err.message);
        }
    });
}

module.exports = { setupAuthHandlers };
