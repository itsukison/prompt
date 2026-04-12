const Anthropic = require('@anthropic-ai/sdk');

// Claude Sonnet 4.6 — the model ID per Anthropic docs
const CLAUDE_MODEL = 'claude-sonnet-4-6';

const WRITING_STYLE_GUIDES = {
    professional: "Write in a clear, polished, and business-appropriate tone. Use complete sentences, avoid slang, and maintain a respectful, confident voice.",
    casual: "Write in a friendly, conversational tone. Use contractions, simple language, and feel free to be warm and approachable.",
    concise: "Write in a direct, minimal style. Get to the point quickly, avoid filler words, and keep sentences short.",
    creative: "Write with personality and flair. Vary sentence structure, use expressive language, and don't be afraid to show character.",
};

/**
 * Initialize Anthropic Claude client
 * @returns {Anthropic|null}
 */
function initClaude() {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
        console.warn('[Claude] CLAUDE_API_KEY not found in environment variables. Claude models will be unavailable.');
        return null;
    }
    console.log('[Claude] CLAUDE_API_KEY found, initializing Claude client');
    return new Anthropic({ apiKey });
}

/**
 * Get writing style guide string for a user profile
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
 * Generate text using Claude Sonnet 4.6, with optional screenshot context
 * @param {Anthropic} claudeAI
 * @param {string} prompt
 * @param {object} userProfile
 * @param {object|null} supabase
 * @param {object|null} screenshotContext - structured analysis from analyzeScreenshot()
 * @param {object|null} chatSessionRef - { current: chatSession } mutable ref
 * @param {AbortSignal|null} abortSignal
 * @param {{ url: string, title: string } | null} browserContext
 * @returns {Promise<{ text: string, usageMetadata: object }>}
 */
async function generateWithClaude(claudeAI, prompt, userProfile, supabase, screenshotContext, chatSessionRef, abortSignal = null, browserContext = null) {
    if (!claudeAI) throw new Error('Claude API not initialized. Check your CLAUDE_API_KEY.');

    if (abortSignal?.aborted) throw new Error('Aborted');

    const { getAllFacts, formatFactsForPrompt } = require('./facts-service');
    const styleGuide = getWritingStyleGuide(userProfile);

    // Fetch facts for memory context
    let factsContext = '';
    if (supabase && userProfile && userProfile.memory_enabled !== false) {
        try {
            const facts = await getAllFacts(supabase, userProfile.id);
            factsContext = formatFactsForPrompt(facts);
            if (facts.length > 0) {
                console.log(`[Facts] Injecting ${facts.length} fact(s) into Claude prompt`);
            }
        } catch (err) {
            console.error('[Facts] Failed to fetch facts for Claude:', err.message);
        }
    }

    // Build system instruction using shared prompt builder
    const { getSystemPrompt } = require('./prompts');
    const systemInstruction = getSystemPrompt(
        userProfile?.language || 'en',
        styleGuide,
        factsContext,
        browserContext,
        screenshotContext,
        userProfile?.display_name || ''
    );

    // Initialize multi-turn session on first call
    if (!chatSessionRef.current) {
        chatSessionRef.current = { provider: 'claude', messages: [] };
        console.log(`[Claude] Started new chat session using ${CLAUDE_MODEL}`);
    }

    // Build user message — inject structured screen context as text when available
    let userContent;
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
        userContent = lines.join('\n');
    } else {
        userContent = prompt;
    }

    chatSessionRef.current.messages.push({ role: 'user', content: userContent });

    if (abortSignal?.aborted) throw new Error('Aborted');

    const response = await claudeAI.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 2048,
        system: systemInstruction,
        messages: chatSessionRef.current.messages,
    }, { signal: abortSignal });

    if (abortSignal?.aborted) throw new Error('Aborted');

    const text = response.content[0]?.text || '';
    chatSessionRef.current.messages.push({ role: 'assistant', content: text });

    return {
        text,
        usageMetadata: {
            promptTokenCount: response.usage?.input_tokens || 0,
            candidatesTokenCount: response.usage?.output_tokens || 0,
        },
    };
}

module.exports = { initClaude, generateWithClaude };
