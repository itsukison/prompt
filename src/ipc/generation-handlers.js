const { ipcMain } = require('electron');
const { ok, fail } = require('../utils/ipc-response');

let currentGenerationController = null;

/**
 * @param {object} deps - { desktopCapturer, getAppState }
 */
function setupGenerationHandlers({ desktopCapturer, getAppState }) {
    ipcMain.handle('generate-text', async (event, prompt, options = {}) => {
        // Abort previous generation if any
        if (currentGenerationController) {
            currentGenerationController.abort();
        }
        currentGenerationController = new AbortController();
        const signal = currentGenerationController.signal;

        try {
            const state = getAppState();
            const { includeScreenshot } = options;

            const modelId = state.currentUserProfile?.selected_model || 'gemini-2.5-flash';
            const thinkingEnabled = state.currentUserProfile?.thinking_enabled || false;
            const isGrok = modelId.startsWith('grok-');

            let screenshotContext = null;

            if (includeScreenshot) {
                console.log('[IPC] Screenshot requested, capturing...');
                const { captureScreenshot, analyzeScreenshot } = require('../services/context-service');
                const screenshotResult = await captureScreenshot(desktopCapturer, state.previousApp);
                if (screenshotResult && typeof screenshotResult === 'object' && screenshotResult.error) {
                    return { success: false, error: screenshotResult.error };
                }
                if (screenshotResult) {
                    state.overlayWindow?.webContents.send('generation-status', 'Analyzing...');
                    const analysis = await analyzeScreenshot(state.genAI, screenshotResult);
                    console.log('[Screenshot Analysis]:', JSON.stringify(analysis, null, 2));
                    if (analysis.clarification_needed) {
                        return ok({ text: analysis.clarification_message });
                    }
                    screenshotContext = analysis;
                    state.overlayWindow?.webContents.send('generation-status', 'Writing...');
                }
            }

            if (signal.aborted) throw new Error('Aborted');

            let text, usageMetadata;
            if (isGrok) {
                const { generateWithGrok } = require('../services/grok-service');
                ({ text, usageMetadata } = await generateWithGrok(
                    state.grokAI,
                    prompt,
                    state.currentUserProfile,
                    state.supabase,
                    screenshotContext,
                    state.chatSessionRef,
                    modelId,
                    signal,
                    state.previousBrowserContext
                ));
            } else {
                const { generateText } = require('../services/gemini-service');
                ({ text, usageMetadata } = await generateText(
                    state.genAI,
                    prompt,
                    state.currentUserProfile,
                    state.supabase,
                    screenshotContext,
                    state.chatSessionRef,
                    state.overlayWindow,
                    signal,
                    state.previousBrowserContext,
                    modelId,
                    thinkingEnabled
                ));
            }

            // Track token usage
            if (state.isAuthenticated && state.currentUserProfile && state.supabase && usageMetadata) {
                try {
                    const promptTokens = usageMetadata.promptTokenCount || 0;
                    const completionTokens = usageMetadata.candidatesTokenCount || 0;
                    const totalTokens = promptTokens + completionTokens;

                    await state.supabase.from('usage_logs').insert({
                        user_id: state.currentUserProfile.id,
                        prompt_text: prompt.substring(0, 500),
                        prompt_tokens: promptTokens,
                        completion_tokens: completionTokens,
                        model: modelId,
                    });

                    await state.supabase.from('user_profiles').update({
                        tokens_used: state.currentUserProfile.tokens_used + totalTokens,
                        tokens_remaining: Math.max(0, state.currentUserProfile.tokens_remaining - totalTokens),
                        updated_at: new Date().toISOString(),
                    }).eq('id', state.currentUserProfile.id);

                    // Mutate through the proxy getter — direct property mutation works since it's the same object reference
                    state.currentUserProfile.tokens_used += totalTokens;
                    state.currentUserProfile.tokens_remaining = Math.max(0, state.currentUserProfile.tokens_remaining - totalTokens);
                } catch (err) {
                    console.error('[Token Tracking] Failed to track usage:', err.message);
                }
            }

            // Track interaction for memory session
            if (state.currentMemorySession && state.isAuthenticated && state.currentUserProfile?.memory_enabled !== false) {
                state.currentMemorySession.interactions.push({
                    prompt: prompt.substring(0, 1000),
                    response: text.substring(0, 1000),
                    timestamp: new Date().toISOString()
                });
                console.log(`[Memory] Tracked interaction (${state.currentMemorySession.interactions.length} total)`);
            }

            return ok({ text });
        } catch (error) {
            if (error.message === 'Aborted' || signal.aborted) {
                console.log('[IPC] Generation aborted by user');
                return { success: false, error: 'Cancelled' };
            }
            console.error('Generation error:', error);
            return fail(error.message);
        } finally {
            if (currentGenerationController?.signal === signal) {
                currentGenerationController = null;
            }
        }
    });

    ipcMain.handle('cancel-text-generation', async () => {
        if (currentGenerationController) {
            console.log('[IPC] Cancelling generation...');
            currentGenerationController.abort();
            currentGenerationController = null;
        }
        return ok({ cancelled: true });
    });

    ipcMain.handle('check-context-need', async (event, prompt) => {
        const state = getAppState();

        // Respect user's screenshot toggle
        if (state.currentUserProfile?.screenshot_enabled === false) {
            return { needsContext: false, source: 'disabled' };
        }

        const { checkContextNeed, checkContextWithLLM } = require('../services/context-service');
        const heuristicResult = checkContextNeed(prompt);
        console.log('[Context Check] Heuristics:', heuristicResult);

        if (heuristicResult.confidence === 'high') {
            return { needsContext: heuristicResult.needsContext, source: 'heuristics' };
        }

        console.log('[Context Check] Low confidence, consulting LLM...');
        const llmResult = await checkContextWithLLM(state.genAI, prompt);
        return { needsContext: llmResult, source: 'llm' };
    });

    ipcMain.handle('screenshot:capture', async () => {
        const state = getAppState();
        const { captureScreenshot } = require('../services/context-service');
        return await captureScreenshot(desktopCapturer, state.previousApp);
    });
}

module.exports = { setupGenerationHandlers };
