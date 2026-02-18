// Context detection patterns - English
// Rules: only fire when the user clearly references on-screen content (this/that/it/here/above)
const CONTEXT_PATTERNS_EN = [
    // "reply to this", "respond to it", "answer this" — requires explicit demonstrative
    /\b(reply|respond|answer)\s+(to\s+)?(this|that|it)\b/i,
    // "what should I say to this", "what do I write back to this"
    /\bwhat\s+(should|do|can|would)\s+i\s+(say|write|respond|reply)\s+(to\s+)?(this|that|it)\b/i,
    // "this email", "this message", "this post" — explicit on-screen reference
    /\bthis\s+(email|message|post|comment|tweet|text|slack|dm|thread)\b/i,
    // "how should I reply to this"
    /\bhow\s+(should|do|can|would)\s+i\s+(reply|respond|answer)\s+(to\s+)?(this|that|it)\b/i,
    // "write a reply to this", "write a response to this"
    /\bwrite\s+(a\s+)?(response|reply|answer)\s+(to\s+)?(this|that|it)\b/i,
];

// Context detection patterns - Japanese
const CONTEXT_PATTERNS_JP = [
    /返信|返事|リプライ|リプ/,
    /返す|返して|返答/,
    /このメール|このメッセージ|この投稿|このコメント/,
    /なんて(言|い)(う|え)|何(と|て)(言|い)(う|え)/,
    /どう(返|答)(す|え)/,
    /これに(対して|ついて)/,
];

const CONTEXT_KEYWORDS_EN = [
    'reply to this', 'respond to this', 'answer this',
    'what should i say', 'how do i respond', 'write back'
];

const CONTEXT_KEYWORDS_JP = [
    '返信して', '返事を', 'これに返信', 'これに返す',
    '何て言えば', 'どう返せば', 'どう答えれば'
];

/**
 * Layer 1: Local heuristics to check if visual context is needed
 * @param {string} prompt
 * @returns {{ needsContext: boolean|null, confidence: 'high'|'low' }}
 */
function checkContextNeed(prompt) {
    const lowerPrompt = prompt.toLowerCase();

    for (const keyword of CONTEXT_KEYWORDS_EN) {
        if (lowerPrompt.includes(keyword)) return { needsContext: true, confidence: 'high' };
    }
    for (const keyword of CONTEXT_KEYWORDS_JP) {
        if (prompt.includes(keyword)) return { needsContext: true, confidence: 'high' };
    }
    for (const pattern of CONTEXT_PATTERNS_EN) {
        if (pattern.test(prompt)) return { needsContext: true, confidence: 'high' };
    }
    for (const pattern of CONTEXT_PATTERNS_JP) {
        if (pattern.test(prompt)) return { needsContext: true, confidence: 'high' };
    }
    // Only escalate to LLM when demonstrative + communication verb appear together
    const hasDemo = /\b(this|that|these|those)\b/i.test(prompt) || /これ|それ|あれ|この|その/.test(prompt);
    const hasCommVerb = /\b(reply|respond|answer|write|say|message|email)\b/i.test(prompt) || /返信|返事|書|言/.test(prompt);
    if (hasDemo && hasCommVerb) {
        return { needsContext: null, confidence: 'low' };
    }
    return { needsContext: false, confidence: 'high' };
}

/**
 * Layer 2: Use LLM for ambiguous cases
 * @param {GoogleGenerativeAI} genAI
 * @param {string} prompt
 * @returns {Promise<boolean>}
 */
async function checkContextWithLLM(genAI, prompt) {
    if (!genAI) return false;
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
        const checkPrompt = `Does this request REQUIRE seeing the user's screen to respond — meaning it references a specific visible email, message, or document that cannot be answered without seeing it?\n\nUser request: "${prompt}"\n\nOnly answer YES if the request explicitly refers to something on screen. Answer NO for generic writing requests, even if they mention replies or emails in general.\n\nAnswer with only: YES or NO`;
        const result = await model.generateContent(checkPrompt);
        const response = result.response.text().trim().toUpperCase();
        console.log('[Context Check] LLM response:', response);
        return response.includes('YES');
    } catch (error) {
        console.error('[Context Check] LLM check failed:', error.message);
        return false;
    }
}

/**
 * Capture a screenshot of the previous app's window
 * @param {Electron.DesktopCapturer} desktopCapturer
 * @param {string|null} previousApp
 * @returns {Promise<string|{error: string}|null>}
 */
async function captureScreenshot(desktopCapturer, previousApp) {
    try {
        // Check Screen Recording permission on macOS before attempting capture
        const { systemPreferences } = require('electron');
        if (process.platform === 'darwin' && systemPreferences.getMediaAccessStatus) {
            const screenStatus = systemPreferences.getMediaAccessStatus('screen');
            console.log('[Screenshot] Screen Recording permission status:', screenStatus);
            if (screenStatus !== 'granted') {
                return { error: 'screen_recording_permission' };
            }
        }

        const sources = await desktopCapturer.getSources({
            types: ['window'],
            thumbnailSize: { width: 1920, height: 1080 }
        });

        console.log('[Screenshot] Got', sources.length, 'window sources');

        let targetSource = null;
        if (previousApp) {
            targetSource = sources.find(source =>
                source.name.toLowerCase().includes(previousApp.toLowerCase())
            );
        }
        if (!targetSource) {
            targetSource = sources.find(source =>
                !source.name.toLowerCase().includes('promptos')
            );
        }
        if (!targetSource) {
            // Fallback: capture the entire screen instead of a specific window
            console.log('[Screenshot] No suitable window found, falling back to screen capture');
            const screenSources = await desktopCapturer.getSources({
                types: ['screen'],
                thumbnailSize: { width: 1920, height: 1080 }
            });
            if (screenSources.length > 0) {
                targetSource = screenSources[0];
                console.log('[Screenshot] Using screen source:', targetSource.name);
            } else {
                console.warn('[Screenshot] No screen sources available either');
                return null;
            }
        }

        console.log('[Screenshot] Captured window:', targetSource.name);

        if (targetSource.thumbnail.isEmpty()) {
            console.warn('[Screenshot] Thumbnail is empty - Screen Recording permission likely not granted');
            return { error: 'screen_recording_permission' };
        }

        const dataUrl = targetSource.thumbnail.toDataURL();
        const commaIdx = dataUrl.indexOf(',');
        if (commaIdx === -1 || dataUrl.substring(commaIdx + 1).length === 0) {
            console.warn('[Screenshot] Thumbnail data URL is empty - Screen Recording permission likely not granted');
            return { error: 'screen_recording_permission' };
        }

        return dataUrl;
    } catch (error) {
        console.error('[Screenshot] Capture failed:', error);
        return null;
    }
}

module.exports = { checkContextNeed, checkContextWithLLM, captureScreenshot };
