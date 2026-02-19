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
 * @param {string|null} previousApp - process/app name
 * @param {string|null} previousWindow - specific window title captured at shortcut time
 * @returns {Promise<string|{error: string}|null>}
 */
async function captureScreenshot(desktopCapturer, previousApp, previousWindow) {
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

        // 1. Prefer exact window title match (avoids wrong window when app has multiple)
        if (previousWindow) {
            const lowerWindow = previousWindow.toLowerCase();
            targetSource = sources.find(source =>
                source.name.toLowerCase() === lowerWindow
            );
            // Fallback: substring match on window title
            if (!targetSource) {
                targetSource = sources.find(source =>
                    source.name.toLowerCase().includes(lowerWindow) ||
                    lowerWindow.includes(source.name.toLowerCase())
                );
            }
            if (targetSource) {
                console.log('[Screenshot] Matched by window title:', targetSource.name);
            }
        }

        // 2. Fall back to app-name match (original behaviour)
        if (!targetSource && previousApp) {
            targetSource = sources.find(source =>
                source.name.toLowerCase().includes(previousApp.toLowerCase())
            );
        }

        // 3. Last resort: first non-promptos window
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

/**
 * Analyze a screenshot to determine content type and whether a reply target exists.
 * Uses gemini-2.5-flash-lite for a cheap pre-processing step before the main model.
 * @param {GoogleGenerativeAI} genAI
 * @param {string} screenshotDataUrl
 * @returns {Promise<object>} Analysis result with content_type, has_reply_target, reply_to_content, sender, language, summary, clarification_needed, clarification_message
 */
async function analyzeScreenshot(genAI, screenshotDataUrl) {
    const analyzerPrompt = `Analyze this screenshot and respond with a single JSON object. No other text — only the JSON.

Schema:
{
  "content_type": "<one of: chat_message | email | delivery_notification | document | app_ui | unknown>",
  "platform": "<one of: gmail | outlook | apple_mail | slack | discord | line | teams | whatsapp | imessage | twitter | instagram | linkedin | unknown>",
  "has_reply_target": <true if there is a specific message or email addressed TO the user that they could meaningfully reply to; false otherwise>,
  "sender": "<name or handle of the person who wrote the message TO the user — in email this is the FROM field; null if not visible>",
  "reply_to_content": "<the actual text of the message body — faithful verbatim or very close paraphrase. Include the sender's specific points, proposals, questions, context, and tone. This will be read by another AI to draft a reply, so include everything meaningful>",
  "language": "<ISO 639-1 code of the language used in the message content; null if undetermined>",
  "summary": "<one sentence describing what is visible on screen>",
  "clarification_needed": <true if no clear reply target exists; false if has_reply_target is true>,
  "clarification_message": "<if clarification_needed: short natural sentence telling user what you see and asking what they want to write; null if not needed>"
}

Rules:
1. SENDER — The sender is the person who wrote the message TO the user, shown in the FROM field of emails or the name above a chat bubble. The currently logged-in user (whose name or email address may appear in the To/Cc field, the window title bar, or the browser tab) is NEVER the sender. Window title email addresses belong to the logged-in user — ignore them for sender identification.

2. REPLY_TO_CONTENT — Extract the actual message body text written by the sender. Be thorough: include specific questions asked, proposals made, context given, relationship cues (e.g. mutual contacts mentioned), and the sender's apparent intent and tone. Do NOT include: Gmail smart-reply chips (short clickable phrases like "Yes, interested", "No thanks", "Sounds good"), action buttons, navigation labels, UI chrome, or any text that is not part of the written message itself.

3. PLATFORM — Identify from window title, tab text, app chrome, or UI patterns. Gmail shows "- Gmail" in the window title and the user's email address. Apple Mail has a three-pane layout with a toolbar. Slack has a channel list sidebar with hash icons. LINE has a contacts list on the left with green branding.

4. SIDEBAR APPS — For Slack, Discord, LINE, Teams, Mail, Outlook: focus exclusively on the largest or rightmost content panel (the active thread). The sidebar listing contacts or channels is NOT the target.

5. HAS_REPLY_TARGET — Set to false for: package tracking, delivery notifications, promotional emails with no personal message, system dialogs, error messages, settings screens, or anything not addressed personally to the user.

6. Respond with valid JSON only. Do not wrap in markdown code fences.`;

    try {
        if (!screenshotDataUrl.startsWith('data:image/')) throw new Error('Invalid screenshot data URL format');
        const commaIndex = screenshotDataUrl.indexOf(',');
        if (commaIndex === -1) throw new Error('Invalid screenshot data URL format');
        const mimeType = screenshotDataUrl.substring(0, commaIndex).match(/data:(image\/[^;]+)/)?.[1] || 'image/png';
        const base64Data = screenshotDataUrl.substring(commaIndex + 1);

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
        const result = await model.generateContent([
            { inlineData: { mimeType, data: base64Data } },
            { text: analyzerPrompt }
        ]);

        let responseText = result.response.text().trim();
        // Strip accidental markdown fences
        responseText = responseText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        return JSON.parse(responseText);
    } catch (error) {
        console.error('[Screenshot Analysis] Failed:', error.message);
        return {
            content_type: 'unknown',
            platform: 'unknown',
            has_reply_target: false,
            sender: null,
            reply_to_content: null,
            language: null,
            summary: 'Screenshot could not be analyzed.',
            clarification_needed: true,
            clarification_message: "I had trouble reading your screen. Could you describe what you'd like me to help with?"
        };
    }
}

module.exports = { checkContextNeed, checkContextWithLLM, captureScreenshot, analyzeScreenshot };
