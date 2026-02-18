const { ipcMain } = require('electron');
const { ok, fail } = require('../utils/ipc-response');

/**
 * @param {object} deps - { supabase, getAppState, transitionToOverlayMode }
 */
function setupProfileHandlers({ supabase, getAppState, transitionToOverlayMode }) {
    ipcMain.handle('profile:get', async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return fail('Not authenticated');

            const { loadUserProfile } = require('../services/auth-service');
            const profile = await loadUserProfile(supabase, user.id);
            if (!profile) return fail('Profile not found');

            getAppState().currentUserProfile = profile;
            return ok({ profile });
        } catch (err) {
            return fail(err.message);
        }
    });

    ipcMain.handle('profile:update', async (event, updates) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return fail('Not authenticated');

            const { data, error } = await supabase
                .from('user_profiles')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', user.id)
                .select()
                .single();

            if (error) return fail(error.message);
            getAppState().currentUserProfile = data;
            return ok({ profile: data });
        } catch (err) {
            return fail(err.message);
        }
    });

    ipcMain.handle('onboarding:complete', async (event, { displayName, writingStyle, writingStyleGuide }) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return fail('Not authenticated');

            const { data, error } = await supabase
                .from('user_profiles')
                .update({
                    display_name: displayName,
                    writing_style: writingStyle,
                    writing_style_guide: writingStyleGuide || null,
                    onboarding_completed: true,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id)
                .select()
                .single();

            if (error) return fail(error.message);
            getAppState().currentUserProfile = data;
            await transitionToOverlayMode();
            return ok();
        } catch (err) {
            return fail(err.message);
        }
    });

    ipcMain.handle('analyze-writing-style', async (event, sampleText) => {
        try {
            const state = getAppState();
            if (!state.genAI) {
                const { initGemini } = require('../services/gemini-service');
                state.genAI = initGemini();
            }
            if (!state.genAI) return fail('Gemini API not initialized');

            const { analyzeWritingStyle } = require('../services/gemini-service');
            const styleGuide = await analyzeWritingStyle(state.genAI, sampleText);
            return ok({ styleGuide });
        } catch (err) {
            return fail(err.message);
        }
    });
}

module.exports = { setupProfileHandlers };
