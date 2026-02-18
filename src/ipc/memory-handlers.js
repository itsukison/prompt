const { ipcMain } = require('electron');
const { ok, fail } = require('../utils/ipc-response');
const { getAllFacts, getFactCount, addFact, updateFact, deleteFact, MAX_FACTS } = require('../services/facts-service');

/**
 * Setup IPC handlers for facts (formerly memory) system
 * @param {object} deps - { supabase, getAppState }
 */
function setupMemoryHandlers({ supabase, getAppState }) {
    // Get all facts
    ipcMain.handle('facts:get-all', async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return fail('Not authenticated');

            const facts = await getAllFacts(supabase, user.id);
            return ok({ facts });
        } catch (err) {
            return fail(err.message);
        }
    });

    // Add a new fact
    ipcMain.handle('facts:add', async (event, content) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return fail('Not authenticated');

            const fact = await addFact(supabase, user.id, content, 'manual');
            if (!fact) return fail('Maximum of 10 facts reached');
            return ok({ fact });
        } catch (err) {
            return fail(err.message);
        }
    });

    // Update a fact
    ipcMain.handle('facts:update', async (event, factId, content) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return fail('Not authenticated');

            const fact = await updateFact(supabase, user.id, factId, content);
            return ok({ fact });
        } catch (err) {
            return fail(err.message);
        }
    });

    // Delete a fact
    ipcMain.handle('facts:delete', async (event, factId) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return fail('Not authenticated');

            await deleteFact(supabase, user.id, factId);
            return ok();
        } catch (err) {
            return fail(err.message);
        }
    });

    // Toggle memory (facts) enabled
    ipcMain.handle('facts:toggle', async (event, enabled) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return fail('Not authenticated');

            const { data, error } = await supabase
                .from('user_profiles')
                .update({ memory_enabled: enabled })
                .eq('id', user.id)
                .select()
                .single();

            if (error) return fail(error.message);
            const state = getAppState();
            if (state.currentUserProfile) state.currentUserProfile.memory_enabled = enabled;
            return ok({ profile: data });
        } catch (err) {
            return fail(err.message);
        }
    });

    // Get stats (simplified - just count and capacity)
    ipcMain.handle('facts:get-stats', async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return fail('Not authenticated');

            const count = await getFactCount(supabase, user.id);
            return ok({
                stats: {
                    count,
                    max: MAX_FACTS,
                    remaining: MAX_FACTS - count
                }
            });
        } catch (err) {
            return fail(err.message);
        }
    });

    // Backward compatibility aliases - map old memory:* handlers to facts:*
    ipcMain.handle('memory:get-all', async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return fail('Not authenticated');
            const facts = await getAllFacts(supabase, user.id);
            // Return in old format for compatibility
            return ok({ memories: facts.map(f => ({ ...f, category: 'personal_info' })) });
        } catch (err) {
            return fail(err.message);
        }
    });

    ipcMain.handle('memory:add', async (event, content, _category) => {
        // Ignore category - new system doesn't use categories
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return fail('Not authenticated');
            const fact = await addFact(supabase, user.id, content, 'manual');
            if (!fact) return fail('Maximum of 10 facts reached');
            return ok({ memory: fact });
        } catch (err) {
            return fail(err.message);
        }
    });

    ipcMain.handle('memory:update', async (event, factId, content) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return fail('Not authenticated');
            const fact = await updateFact(supabase, user.id, factId, content);
            return ok({ memory: fact });
        } catch (err) {
            return fail(err.message);
        }
    });

    ipcMain.handle('memory:delete', async (event, factId) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return fail('Not authenticated');
            await deleteFact(supabase, user.id, factId);
            return ok();
        } catch (err) {
            return fail(err.message);
        }
    });

    ipcMain.handle('memory:toggle', async (event, enabled) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return fail('Not authenticated');
            const { data, error } = await supabase
                .from('user_profiles')
                .update({ memory_enabled: enabled })
                .eq('id', user.id)
                .select()
                .single();
            if (error) return fail(error.message);
            const state = getAppState();
            if (state.currentUserProfile) state.currentUserProfile.memory_enabled = enabled;
            return ok({ profile: data });
        } catch (err) {
            return fail(err.message);
        }
    });

    ipcMain.handle('memory:get-stats', async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return fail('Not authenticated');
            const count = await getFactCount(supabase, user.id);
            // Return in old format for compatibility
            return ok({
                stats: {
                    total: count,
                    by_category: { personal_info: count },
                    last_session: null
                }
            });
        } catch (err) {
            return fail(err.message);
        }
    });
}

module.exports = { setupMemoryHandlers };
