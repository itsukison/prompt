const { GoogleGenerativeAI } = require('@google/generative-ai');

const TEXT_MODEL = 'gemini-2.5-flash';

const WRITING_STYLE_GUIDES = {
    professional: "Write in a clear, polished, and business-appropriate tone. Use complete sentences, avoid slang, and maintain a respectful, confident voice.",
    casual: "Write in a friendly, conversational tone. Use contractions, simple language, and feel free to be warm and approachable.",
    concise: "Write in a direct, minimal style. Get to the point quickly, avoid filler words, and keep sentences short.",
    creative: "Write with personality and flair. Vary sentence structure, use expressive language, and don't be afraid to show character.",
};

/**
 * Initialize Gemini client
 * @returns {GoogleGenerativeAI|null}
 */
function initGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY not found in environment variables');
        return null;
    }
    return new GoogleGenerativeAI(apiKey);
}

/**
 * Retry wrapper for Gemini calls with exponential backoff
 * @param {Function} operation
 * @param {BrowserWindow|null} overlayWindow - for sending retry status to renderer
 * @param {number} retries
 */
async function generateWithRetry(operation, overlayWindow = null, retries = 3, signal = null) {
    let attempt = 0;
    while (attempt < retries) {
        if (signal?.aborted) {
            throw new Error('Aborted');
        }
        try {
            return await operation();
        } catch (error) {
            if (signal?.aborted || error.name === 'AbortError') {
                throw new Error('Aborted');
            }
            const errorMessage = error.message?.toLowerCase() || '';
            if (errorMessage.includes('quota') || errorMessage.includes('billing') || errorMessage.includes('insufficient_quota')) {
                console.error('[Gemini] Quota exceeded. Stopping retries.');
                throw error;
            }
            const isTransient = error.response?.status === 429 || error.status === 429 || error.status === 503;
            if (isTransient && attempt < retries - 1) {
                let waitTime = Math.pow(2, attempt) * 1000;
                if (error.response?.headers?.['retry-after']) {
                    const retryAfter = parseInt(error.response.headers['retry-after'], 10);
                    if (!isNaN(retryAfter)) waitTime = retryAfter * 1000;
                }
                console.warn(`[Gemini] Rate limit hit (Attempt ${attempt + 1}/${retries}). Retrying in ${waitTime}ms...`);
                if (overlayWindow) {
                    overlayWindow.webContents.send('generation-status', `Server busy, retrying in ${Math.ceil(waitTime / 1000)}s...`);
                }

                // Wait with abort check
                await new Promise((resolve, reject) => {
                    const timeoutId = setTimeout(() => {
                        resolve();
                        handle?.();
                    }, waitTime);
                    const handle = signal ? () => {
                        clearTimeout(timeoutId);
                        reject(new Error('Aborted'));
                    } : null;
                    signal?.addEventListener('abort', handle);
                });

                attempt++;
            } else {
                throw error;
            }
        }
    }
}

/**
 * Get the writing style guide for the current user
 * Note: Communication style is now handled via user facts, not separate memory fetch
 * @param {object} userProfile
 * @returns {string}
 */
function getWritingStyleGuide(userProfile) {
    if (!userProfile) return '';

    const { writing_style, writing_style_guide } = userProfile;

    if (writing_style === 'custom' && writing_style_guide) {
        return writing_style_guide;
    }

    return WRITING_STYLE_GUIDES[writing_style] || WRITING_STYLE_GUIDES.professional;
}

/**
 * Generate text using Gemini, with optional screenshot context (text summary from analyzer)
 * @param {GoogleGenerativeAI} genAI
 * @param {string} prompt
 * @param {object} userProfile
 * @param {object|null} supabase
 * @param {object|null} screenshotContext - structured analysis from analyzeScreenshot()
 * @param {object|null} chatSessionRef - { current: chatSession } mutable ref
 * @param {BrowserWindow|null} overlayWindow
 * @param {AbortSignal|null} abortSignal
 * @param {{ url: string, title: string } | null} browserContext
 * @returns {Promise<{ text: string, usageMetadata: object }>}
 */
async function generateText(genAI, prompt, userProfile, supabase, screenshotContext, chatSessionRef, overlayWindow, abortSignal = null, browserContext = null, modelId = 'gemini-2.5-flash', thinkingEnabled = false) {
    if (!genAI) throw new Error('Gemini API not initialized. Check your GEMINI_API_KEY.');

    const { getAllFacts, formatFactsForPrompt } = require('./facts-service');
    const styleGuide = getWritingStyleGuide(userProfile);

    // Always fetch and inject all facts (no semantic search)
    let factsContext = '';
    if (supabase && userProfile && userProfile.memory_enabled !== false) {
        try {
            const facts = await getAllFacts(supabase, userProfile.id);
            factsContext = formatFactsForPrompt(facts);
            if (facts.length > 0) {
                console.log(`[Facts] Injecting ${facts.length} fact(s) into prompt`);
            }
        } catch (err) {
            console.error('[Facts] Failed to fetch facts:', err.message);
        }
    }

    const { getSystemPrompt } = require('./prompts');

    // Default to 'en' if not provided
    const language = userProfile?.language || 'en';

    // Parts array is now constructed via helper
    const systemInstruction = getSystemPrompt(language, styleGuide, factsContext, browserContext, screenshotContext, userProfile?.display_name || '');

    // Build user message — inject structured screen context as text when available
    let userMessage = prompt;
    if (screenshotContext) {
        const platformLabel = (screenshotContext.platform && screenshotContext.platform !== 'unknown')
            ? ` — ${screenshotContext.platform}`
            : '';
        const lines = [`[Screen content${platformLabel}]`];
        if (screenshotContext.sender) lines.push(`From: ${screenshotContext.sender}`);
        const contentText = screenshotContext.reply_to_content || screenshotContext.summary;
        if (contentText) lines.push(contentText);
        lines.push('');
        lines.push(prompt);
        userMessage = lines.join('\n');
    }

    if (!chatSessionRef.current) {
        const textModel = genAI.getGenerativeModel({ model: modelId, systemInstruction });
        const generationConfig = {
            maxOutputTokens: 2048,
            ...(modelId === 'gemini-2.5-flash' && thinkingEnabled
                ? { thinkingConfig: { thinkingBudget: 8192 } }
                : {}),
        };
        chatSessionRef.current = textModel.startChat({ history: [], generationConfig });
        console.log(`[Gemini] Started new chat session using ${modelId}${modelId === 'gemini-2.5-flash' && thinkingEnabled ? ' (thinking enabled)' : ''}`);
    }
    const result = await generateWithRetry(() => chatSessionRef.current.sendMessage(userMessage), overlayWindow, 3, abortSignal);
    const response = result.response;
    const text = response.text();

    return { text, usageMetadata: response.usageMetadata };
}

/**
 * Analyze a writing sample and produce a style guide string
 * @param {GoogleGenerativeAI} genAI
 * @param {string} sampleText
 * @returns {Promise<string>}
 */
async function analyzeWritingStyle(genAI, sampleText) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    const prompt = `Analyze this writing sample and create a brief style guide (2-3 sentences) that describes the tone, vocabulary level, sentence structure, and any distinctive patterns. Be concise and actionable. The style guide will be used to instruct an AI to write in this person's style.\n\nWriting sample:\n"${sampleText}"\n\nStyle guide:`;
    const result = await model.generateContent(prompt);
    return result.response.text();
}

module.exports = { initGemini, generateText, generateWithRetry, getWritingStyleGuide, analyzeWritingStyle };
