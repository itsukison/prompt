const { app, BrowserWindow, globalShortcut, ipcMain, clipboard, screen, desktopCapturer } = require('electron');
const path = require('path');
const { exec, execSync } = require('child_process');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createSupabaseClient, getSupabaseClient } = require('./supabase');
const { saveMemoryWithEmbedding, embedText, findSimilarMemories } = require('./embedding');
require('dotenv').config();

// =============================================================================
// Configuration
// =============================================================================
const FOCUS_RESTORE_DELAY = 200; // ms to wait after restoring focus before pasting

// Writing style guides for presets
const WRITING_STYLE_GUIDES = {
    professional: "Write in a clear, polished, and business-appropriate tone. Use complete sentences, avoid slang, and maintain a respectful, confident voice.",
    casual: "Write in a friendly, conversational tone. Use contractions, simple language, and feel free to be warm and approachable.",
    concise: "Write in a direct, minimal style. Get to the point quickly, avoid filler words, and keep sentences short.",
    creative: "Write with personality and flair. Vary sentence structure, use expressive language, and don't be afraid to show character.",
};

// =============================================================================
// State
// =============================================================================
let overlayWindow = null;
let mainWindow = null;
let genAI = null;
let supabase = null;
let chatSession = null; // Store current chat session
let previousApp = null; // Store the app that was focused before we showed the overlay
let currentUserProfile = null; // Cached user profile with writing style
let isAuthenticated = false;

// Memory session tracking
let currentMemorySession = null; // Stores { id, interactions: [], startedAt }
let sessionAnalysisTimeout = null; // Debounce session analysis

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
}

// =============================================================================
// Focus Management (macOS)
// =============================================================================

/**
 * Get the name of the currently frontmost application
 * @returns {string|null} The app name or null if failed
 */
function getFrontmostApp() {
    if (process.platform !== 'darwin') {
        return null;
    }

    try {
        const script = 'tell application "System Events" to get name of first process whose frontmost is true';
        const result = execSync(`osascript -e '${script}'`, { encoding: 'utf-8' });
        return result.trim();
    } catch (error) {
        console.error('[Focus] Failed to get frontmost app:', error.message);
        if (error.message.includes('not allowed') || error.message.includes('accessibility')) {
            console.error('[Focus] Accessibility permissions may be required.');
            console.error('[Focus] Go to System Settings > Privacy & Security > Accessibility and enable this app.');
        }
        return null;
    }
}

/**
 * Activate (bring to front) a specific application
 * @param {string} appName - The name of the app to activate
 * @returns {Promise<boolean>} Whether activation succeeded
 */
function activateApp(appName) {
    return new Promise((resolve) => {
        if (process.platform !== 'darwin' || !appName) {
            resolve(false);
            return;
        }

        // Apps that need 'open -a' due to sandboxing or special behavior
        const OPEN_A_APPS = [
            'Google Chrome',
            'Chrome',
            'Brave Browser',
            'Microsoft Edge',
            'Arc'
        ];

        const needsOpenA = OPEN_A_APPS.some(name =>
            appName.toLowerCase().includes(name.toLowerCase())
        );

        if (needsOpenA) {
            // Use 'open -a' for sandboxed browsers
            console.log(`[Focus] Using 'open -a' for "${appName}" (sandboxed app)`);
            exec(`open -a "${appName}"`, (error) => {
                if (error) {
                    console.error(`[Focus] Failed to activate "${appName}":`, error.message);
                    resolve(false);
                } else {
                    console.log(`[Focus] Activated "${appName}"`);
                    resolve(true);
                }
            });
        } else {
            // Use AppleScript for normal apps (preserves window state)
            console.log(`[Focus] Using AppleScript for "${appName}" (preserves window state)`);
            const script = `tell application "${appName}" to activate`;
            exec(`osascript -e '${script}'`, (error) => {
                if (error) {
                    console.warn(`[Focus] AppleScript failed for "${appName}", falling back to 'open -a'`);
                    // Fallback to 'open -a' if AppleScript fails
                    exec(`open -a "${appName}"`, (fallbackError) => {
                        if (fallbackError) {
                            console.error(`[Focus] Fallback also failed for "${appName}":`, fallbackError.message);
                            if (fallbackError.message.includes('not allowed') || fallbackError.message.includes('accessibility')) {
                                console.error('[Focus] Accessibility permissions may be required.');
                                console.error('[Focus] Go to System Settings > Privacy & Security > Accessibility and enable this app.');
                            }
                            resolve(false);
                        } else {
                            console.log(`[Focus] Activated "${appName}" via fallback`);
                            resolve(true);
                        }
                    });
                } else {
                    console.log(`[Focus] Activated "${appName}"`);
                    resolve(true);
                }
            });
        }
    });
}

/**
 * Simulate Cmd+V keystroke
 * @returns {Promise<boolean>} Whether the keystroke was sent
 */
function simulatePaste() {
    return new Promise((resolve) => {
        if (process.platform === 'darwin') {
            exec('osascript -e \'tell application "System Events" to keystroke "v" using command down\'', (error) => {
                if (error) {
                    console.error('[Paste] Failed to simulate paste:', error.message);
                    if (error.message.includes('not allowed') || error.message.includes('accessibility')) {
                        console.error('[Paste] Accessibility permissions required for keystroke simulation.');
                        console.error('[Paste] Go to System Settings > Privacy & Security > Accessibility and enable this app.');
                    }
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        } else if (process.platform === 'win32') {
            exec('powershell -command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys(\'^v\')"', (error) => {
                resolve(!error);
            });
        } else {
            exec('xdotool key ctrl+v', (error) => {
                resolve(!error);
            });
        }
    });
}

// =============================================================================
// Gemini
// =============================================================================

function initGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY not found in environment variables');
        return null;
    }
    return new GoogleGenerativeAI(apiKey);
}

/**
 * Get the writing style guide for the current user (with memory enhancement)
 */
async function getWritingStyleGuide() {
    if (!currentUserProfile) return '';

    const { writing_style, writing_style_guide } = currentUserProfile;

    // Get base style guide
    let baseGuide = '';
    if (writing_style === 'custom' && writing_style_guide) {
        baseGuide = writing_style_guide;
    } else {
        baseGuide = WRITING_STYLE_GUIDES[writing_style] || WRITING_STYLE_GUIDES.professional;
    }

    // Enhance with communication style memories if enabled
    if (supabase && currentUserProfile.memory_enabled !== false) {
        try {
            const { data: styleMemories, error } = await supabase
                .from('user_memories')
                .select('content')
                .eq('user_id', currentUserProfile.id)
                .eq('category', 'communication_style')
                .eq('is_active', true)
                .limit(3);

            if (!error && styleMemories && styleMemories.length > 0) {
                const styleNotes = styleMemories.map(m => m.content).join(' ');
                return `${baseGuide}\n\nUser's communication patterns: ${styleNotes}`;
            }
        } catch (err) {
            console.error('[Memory] Failed to fetch style memories:', err.message);
        }
    }

    return baseGuide;
}

/**
 * Retrieve relevant memories for a given prompt using semantic search
 * @param {string} prompt - User's prompt
 * @returns {Promise<string>} - Formatted memory context string
 */
async function getRelevantMemories(prompt) {
    if (!supabase || !currentUserProfile || currentUserProfile.memory_enabled === false) {
        return '';
    }

    // Skip memory retrieval for simple/short prompts
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length < 15 || trimmedPrompt.split(' ').length < 3) {
        return '';
    }

    // EXCEPTION: Always use memory for context-aware requests
    const contextAwarePatterns = [
        /\b(reply|respond|answer)\s*(to)?\s*(this|the)?\b/i,
        /\bwrite\s+(a\s+)?(response|reply|answer)/i,
        /\b(email|message|letter)\s+(to|for|about)/i,
        /\bfill\s+in/i,
        /\b(my|our)\s+(name|email|company|role)/i
    ];
    
    const needsContext = contextAwarePatterns.some(pattern => pattern.test(trimmedPrompt));
    
    if (!needsContext) {
        // Skip for generic/simple tasks (heuristic check)
        const simpleTaskPatterns = [
            /^write\s+(hello|hi|hey)/i,
            /^make\s+it\s+(shorter|longer|better)/i,
            /^fix\s+grammar/i,
            /^translate/i,
            /^summarize/i
        ];
        
        if (simpleTaskPatterns.some(pattern => pattern.test(trimmedPrompt))) {
            console.log('[Memory] Skipping memory retrieval for simple task');
            return '';
        }
    } else {
        console.log('[Memory] Context-aware request detected, using memory');
    }

    try {
        // Embed the prompt
        const promptEmbedding = await embedText(prompt);

        // Search for similar memories (top 5, threshold 0.7)
        const similarMemories = await findSimilarMemories(
            supabase,
            currentUserProfile.id,
            promptEmbedding,
            0.7,
            5
        );

        if (!similarMemories || similarMemories.length === 0) {
            return '';
        }

        // Group by category and format
        const memoryGroups = {};
        for (const memory of similarMemories) {
            if (!memoryGroups[memory.category]) {
                memoryGroups[memory.category] = [];
            }
            memoryGroups[memory.category].push(memory.content);
        }

        // Format as context string
        const contextParts = [];
        for (const [category, contents] of Object.entries(memoryGroups)) {
            const categoryName = category.replace(/_/g, ' ');
            contextParts.push(`${categoryName}: ${contents.join('; ')}`);
        }

        return contextParts.join('\n');
    } catch (error) {
        console.error('[Memory] Failed to retrieve relevant memories:', error.message);
        return '';
    }
}

async function generateWithRetry(operation, retries = 3) {
    let attempt = 0;
    while (attempt < retries) {
        try {
            return await operation();
        } catch (error) {
            // CRITICAL: Check for hard quota/billing limits - FAIL IMMEDIATELY
            const errorMessage = error.message?.toLowerCase() || '';
            if (errorMessage.includes("quota") ||
                errorMessage.includes("billing") ||
                errorMessage.includes("insufficient_quota")) {
                console.error('[Gemini] Quota exceeded. Stopping retries.');
                throw error;
            }

            // Check for transient 429 or 503 (service unavailable)
            const isTransient = error.response?.status === 429 || error.status === 429 || error.status === 503;

            if (isTransient && attempt < retries - 1) {
                // Calculate wait time
                let waitTime = Math.pow(2, attempt) * 1000; // Default: 1s, 2s, 4s...

                // Respect Retry-After header if available
                if (error.response?.headers?.['retry-after']) {
                    const retryAfter = parseInt(error.response.headers['retry-after'], 10);
                    if (!isNaN(retryAfter)) {
                        waitTime = retryAfter * 1000;
                    }
                }

                console.warn(`[Gemini] Rate limit hit (Attempt ${attempt + 1}/${retries}). Retrying in ${waitTime}ms...`);

                // Send status update to renderer for UX
                if (overlayWindow) {
                    overlayWindow.webContents.send('generation-status', `Server busy, retrying in ${Math.ceil(waitTime / 1000)}s...`);
                }

                await new Promise(resolve => setTimeout(resolve, waitTime));
                attempt++;
            } else {
                // Not transient or out of retries
                throw error;
            }
        }
    }
}

async function generateText(prompt, screenshotDataUrl = null) {
    if (!genAI) {
        throw new Error('Gemini API not initialized. Check your GEMINI_API_KEY.');
    }

    // Build system instruction with writing style and relevant memories
    const styleGuide = await getWritingStyleGuide();
    const relevantMemories = await getRelevantMemories(prompt);

    let systemInstruction = '';
    if (styleGuide) {
        systemInstruction = `Writing style: ${styleGuide}`;
    }

    if (relevantMemories) {
        systemInstruction += `\n\nPersonal context about the user:\n${relevantMemories}`;
    }

    systemInstruction += '\n\nYou are a helpful writing assistant. Generate concise, well-written text based on the user\'s request. Use the personal context naturally when relevant (e.g., for filling in sender info, matching their style), but don\'t overuse it in simple tasks. Output only the requested text, no explanations or meta-commentary.';

    const model = genAI.getGenerativeModel({
        model: 'gemini-3-flash-preview',
        systemInstruction
    });

    let result;
    let response;
    let text;

    if (screenshotDataUrl) {
        // Multimodal generation with screenshot
        console.log('[Gemini] Using multimodal generation with screenshot');

        // Parse data URL using string methods (more robust than regex for large strings)
        if (!screenshotDataUrl.startsWith('data:image/')) {
            console.error('[Gemini] Invalid data URL: does not start with data:image/');
            throw new Error('Invalid screenshot data URL format');
        }

        const commaIndex = screenshotDataUrl.indexOf(',');
        if (commaIndex === -1) {
            console.error('[Gemini] Invalid data URL: no comma separator found');
            throw new Error('Invalid screenshot data URL format');
        }

        // Extract MIME type from "data:image/png;base64"
        const header = screenshotDataUrl.substring(0, commaIndex);
        const mimeMatch = header.match(/data:(image\/[^;]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

        // Extract base64 data after the comma
        const base64Data = screenshotDataUrl.substring(commaIndex + 1);

        // Debug logging
        console.log('[Gemini] Screenshot MIME type:', mimeType);
        console.log('[Gemini] Screenshot base64 length:', base64Data.length);

        const parts = [
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                }
            },
            { text: `[Visual context from user's screen is provided above]\n\n${prompt}` }
        ];

        // Multimodal requires direct generateContent (not chat session)
        result = await generateWithRetry(() => model.generateContent(parts));
        response = result.response;
        text = response.text();
    } else {
        // Text-only: use chat session for conversation context
        if (!chatSession) {
            chatSession = model.startChat({
                history: [],
                generationConfig: {
                    maxOutputTokens: 2048,
                },
            });
            console.log('[Gemini] Started new chat session');
        }

        result = await generateWithRetry(() => chatSession.sendMessage(prompt));
        response = result.response;
        text = response.text();
    }

    // Track token usage if authenticated
    if (isAuthenticated && currentUserProfile && supabase) {
        try {
            const usageMetadata = response.usageMetadata;
            if (usageMetadata) {
                const promptTokens = usageMetadata.promptTokenCount || 0;
                const completionTokens = usageMetadata.candidatesTokenCount || 0;
                const totalTokens = promptTokens + completionTokens;

                // Insert usage log
                await supabase.from('usage_logs').insert({
                    user_id: currentUserProfile.id,
                    prompt_text: prompt.substring(0, 500), // Truncate for storage
                    prompt_tokens: promptTokens,
                    completion_tokens: completionTokens,
                    model: 'gemini-3-flash-preview',
                });

                // Update user token counts
                await supabase.from('user_profiles').update({
                    tokens_used: currentUserProfile.tokens_used + totalTokens,
                    tokens_remaining: Math.max(0, currentUserProfile.tokens_remaining - totalTokens),
                    updated_at: new Date().toISOString(),
                }).eq('id', currentUserProfile.id);

                // Update local cache
                currentUserProfile.tokens_used += totalTokens;
                currentUserProfile.tokens_remaining = Math.max(0, currentUserProfile.tokens_remaining - totalTokens);
            }
        } catch (err) {
            console.error('[Token Tracking] Failed to track usage:', err.message);
        }
    }

    // Track interaction for memory session
    if (currentMemorySession && isAuthenticated && currentUserProfile?.memory_enabled !== false) {
        currentMemorySession.interactions.push({
            prompt: prompt.substring(0, 1000), // Limit length
            response: text.substring(0, 1000),
            timestamp: new Date().toISOString()
        });
        console.log(`[Memory] Tracked interaction (${currentMemorySession.interactions.length} total)`);
    }

    return text;
}

// =============================================================================
// Memory Analysis
// =============================================================================

/**
 * Analyze a session to extract memorable information
 * @param {Object} session - Session object with interactions array
 */
async function analyzeSessionForMemories(session) {
    if (!genAI || !supabase || !isAuthenticated || !currentUserProfile) {
        console.log('[Memory] Skipping analysis: prerequisites not met');
        return;
    }

    // Check if memory is enabled for this user
    if (currentUserProfile.memory_enabled === false) {
        console.log('[Memory] Memory disabled for user, skipping analysis');
        return;
    }

    try {
        console.log(`[Memory] Analyzing session with ${session.interactions.length} interactions`);

        // Build conversation context for LLM
        const conversationText = session.interactions
            .map((interaction, i) => {
                return `[${i + 1}] User: ${interaction.prompt}\nAssistant: ${interaction.response}`;
            })
            .join('\n\n');

        // Use cheap model for analysis
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-lite'
        });

        const analysisPrompt = `Analyze this conversation between a user and an AI writing assistant. Extract useful information that would help personalize future interactions.

Conversation:
${conversationText}

Extract the following types of information (only if clearly present):
1. **Personal Info**: Name, role/job, location, company, email signature preferences, etc.
2. **Communication Style**: How they prefer to communicate (formal/casual, emoji usage, sentence structure, common phrases, tone preferences)
3. **Preferences**: Preferred formats (bullets vs paragraphs), topics they mention frequently, things they care about
4. **Work Context**: Projects they're working on, colleagues/clients mentioned, industry/domain

Return a JSON array of memories. Each memory should have:
- "category": one of ["personal_info", "communication_style", "preferences", "work_context"]
- "content": a clear, concise statement (1-2 sentences) about what you learned
- "confidence": "high" or "medium" (only include high/medium confidence items)

If you found nothing useful to remember, return an empty array [].

Example output:
[
  {"category": "personal_info", "content": "User's name is Sarah and works as a product manager at TechCorp.", "confidence": "high"},
  {"category": "communication_style", "content": "Prefers concise, bullet-pointed responses. Uses casual tone with phrases like 'circling back' and 'touching base'.", "confidence": "high"}
]

Return ONLY valid JSON, no other text.`;

        const result = await model.generateContent(analysisPrompt);
        const responseText = result.response.text().trim();

        // Parse JSON response
        let memories = [];
        try {
            // Remove markdown code blocks if present
            const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            memories = JSON.parse(jsonText);
        } catch (parseError) {
            console.error('[Memory] Failed to parse LLM response as JSON:', parseError.message);
            console.error('[Memory] Response:', responseText.substring(0, 200));
            return;
        }

        if (!Array.isArray(memories) || memories.length === 0) {
            console.log('[Memory] No useful memories extracted from session');
            return;
        }

        console.log(`[Memory] Extracted ${memories.length} potential memories`);

        // Save session to database first
        const { data: savedSession, error: sessionError } = await supabase
            .from('memory_sessions')
            .insert({
                user_id: currentUserProfile.id,
                session_data: session.interactions,
                analyzed: true,
                created_at: session.startedAt,
                closed_at: new Date().toISOString()
            })
            .select()
            .single();

        if (sessionError) {
            console.error('[Memory] Failed to save session:', sessionError.message);
        }

        // Process each memory with embedding and duplicate checking
        for (const memory of memories) {
            if (!memory.content || !memory.category) continue;

            try {
                const savedMemory = await saveMemoryWithEmbedding(
                    supabase,
                    currentUserProfile.id,
                    memory.content,
                    memory.category,
                    {
                        confidence: memory.confidence || 'medium',
                        session_id: savedSession?.id,
                        extracted_at: new Date().toISOString()
                    }
                );

                if (savedMemory) {
                    console.log(`[Memory] Saved: [${memory.category}] ${memory.content.substring(0, 50)}...`);
                } else {
                    console.log(`[Memory] Skipped duplicate: ${memory.content.substring(0, 50)}...`);
                }
            } catch (error) {
                console.error('[Memory] Failed to save memory with embedding:', error.message);
            }
        }

        console.log('[Memory] Session analysis complete');
    } catch (error) {
        console.error('[Memory] Session analysis failed:', error.message);
    }
}

// =============================================================================
// Context Awareness
// =============================================================================

// Context detection patterns - English
const CONTEXT_PATTERNS_EN = [
    /\b(reply|respond|answer)\s*(to)?\s*(this|the)?\b/i,
    /\bwhat\s+(should|do|can|would)\s+i\s+(say|write|respond|reply)\b/i,
    /\b(this|the)\s+(email|message|post|comment|tweet|text|slack|dm)\b/i,
    /\bhow\s+(should|do|can|would)\s+i\s+(reply|respond|answer)\b/i,
    /\bwrite\s+(a\s+)?(response|reply|answer)\s*(to)?\s*(this)?\b/i,
    /\bget\s+back\s+to\b/i,
];

// Context detection patterns - Japanese
const CONTEXT_PATTERNS_JP = [
    /返信|返事|リプライ|リプ/,           // reply
    /返す|返して|返答/,                   // respond
    /このメール|このメッセージ|この投稿|このコメント/, // this email/message/post/comment
    /なんて(言|い)(う|え)|何(と|て)(言|い)(う|え)/, // what should I say
    /どう(返|答)(す|え)/,                 // how to reply
    /これに(対して|ついて)/,              // regarding this
];

// Keywords that strongly indicate context need - English
const CONTEXT_KEYWORDS_EN = [
    'reply to this', 'respond to this', 'answer this',
    'what should i say', 'how do i respond', 'write back'
];

// Keywords that strongly indicate context need - Japanese
const CONTEXT_KEYWORDS_JP = [
    '返信して', '返事を', 'これに返信', 'これに返す',
    '何て言えば', 'どう返せば', 'どう答えれば'
];

/**
 * Layer 1: Local heuristics to check if visual context is needed
 * @param {string} prompt - The user's prompt
 * @returns {{ needsContext: boolean|null, confidence: 'high'|'low' }}
 */
function checkContextNeed(prompt) {
    const lowerPrompt = prompt.toLowerCase();

    // Check English keywords (exact match = high confidence)
    for (const keyword of CONTEXT_KEYWORDS_EN) {
        if (lowerPrompt.includes(keyword)) {
            return { needsContext: true, confidence: 'high' };
        }
    }

    // Check Japanese keywords
    for (const keyword of CONTEXT_KEYWORDS_JP) {
        if (prompt.includes(keyword)) {
            return { needsContext: true, confidence: 'high' };
        }
    }

    // Check English patterns
    for (const pattern of CONTEXT_PATTERNS_EN) {
        if (pattern.test(prompt)) {
            return { needsContext: true, confidence: 'high' };
        }
    }

    // Check Japanese patterns
    for (const pattern of CONTEXT_PATTERNS_JP) {
        if (pattern.test(prompt)) {
            return { needsContext: true, confidence: 'high' };
        }
    }

    // Ambiguous: has demonstrative but no clear context keyword
    if (/\b(this|that|these|those)\b/i.test(prompt) || /これ|それ|あれ|この|その/.test(prompt)) {
        return { needsContext: null, confidence: 'low' };
    }

    return { needsContext: false, confidence: 'high' };
}

/**
 * Layer 2: Use cheap LLM to check if context is needed (for ambiguous cases)
 * @param {string} prompt - The user's prompt
 * @returns {Promise<boolean>}
 */
async function checkContextWithLLM(prompt) {
    if (!genAI) return false;

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash-lite'
        });

        const checkPrompt = `Analyze this user request and determine if it requires visual context from the user's screen to answer properly.

User request: "${prompt}"

Does this request need to see what's on the user's screen (like an email, message, document, or UI) to provide a good response?

Answer with only: YES or NO`;

        const result = await model.generateContent(checkPrompt);
        const response = result.response.text().trim().toUpperCase();
        console.log('[Context Check] LLM response:', response);
        return response.includes('YES');
    } catch (error) {
        console.error('[Context Check] LLM check failed:', error.message);
        return false; // Default to no context if check fails
    }
}

/**
 * Capture screenshot of the previous app's window
 * @returns {Promise<string|null>} Base64 data URL or null
 */
async function captureScreenshot() {
    try {
        const sources = await desktopCapturer.getSources({
            types: ['window'],
            thumbnailSize: { width: 1920, height: 1080 }
        });

        // Find the previous app's window
        let targetSource = null;

        if (previousApp) {
            // Try to match by app name
            targetSource = sources.find(source =>
                source.name.toLowerCase().includes(previousApp.toLowerCase())
            );
        }

        // Fallback to first non-promptOS window
        if (!targetSource) {
            targetSource = sources.find(source =>
                !source.name.toLowerCase().includes('promptos')
            );
        }

        if (!targetSource) {
            console.warn('[Screenshot] No suitable window found');
            return null;
        }

        console.log('[Screenshot] Captured window:', targetSource.name);

        // Check if thumbnail has actual pixel data
        if (targetSource.thumbnail.isEmpty()) {
            console.warn('[Screenshot] Thumbnail is empty - Screen Recording permission likely not granted');
            return { error: 'screen_recording_permission' };
        }

        const dataUrl = targetSource.thumbnail.toDataURL();

        // Secondary check: empty base64 data despite non-empty NativeImage
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

// =============================================================================
// Window Management
// =============================================================================

// ... (imports)

// Icon path
const ICON_PATH = path.join(__dirname, '..', 'public', 'logo.png');

// ... (rest of configuration)

// ...

function createMainWindow() {
    if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
        return mainWindow;
    }

    mainWindow = new BrowserWindow({
        width: 480,
        height: 640,
        minWidth: 400,
        minHeight: 500,
        frame: true,
        transparent: false,
        resizable: true,
        show: true,
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#1a1a1a',
        icon: ICON_PATH, // Set icon
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'renderer', 'main-window.html'));

    mainWindow.on('closed', () => {
        mainWindow = null;
        
        // Keep dock visible if in overlay mode (authenticated with overlay active)
        // This ensures users can still access settings from the dock
        if (process.platform === 'darwin' && isAuthenticated && overlayWindow) {
            app.dock?.show?.();
        }
    });

    // Show dock when main window is open
    if (process.platform === 'darwin') {
        app.dock?.show?.();
        app.dock?.setIcon?.(ICON_PATH); // Set dock icon
    }

    return mainWindow;
}

function createOverlayWindow() {
    if (overlayWindow) return overlayWindow;

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    const windowWidth = 600;
    const windowHeight = 400;

    overlayWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        x: Math.round((width - windowWidth) / 2),
        y: height - windowHeight + 45,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        hasShadow: false,
        show: false,
        icon: ICON_PATH, // Set icon
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    overlayWindow.loadFile(path.join(__dirname, '..', 'dist', 'renderer', 'index.html'));

    // macOS specific settings
    if (process.platform === 'darwin') {
        overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        overlayWindow.setHiddenInMissionControl(true);
    }

    return overlayWindow;
}

function updateOverlayContext() {
    if (!overlayWindow || !overlayWindow.isVisible()) {
        console.log('[Overlay] Not visible, ignoring context update request');
        return;
    }

    // Capture the frontmost app logic again because user might have switched apps to select text
    previousApp = getFrontmostApp();
    console.log(`[Focus] Re-captured previous app during update: "${previousApp}"`);

    (async () => {
        // Capture selection
        const selection = await getSelectedText();

        // Bring overlay to front/focus
        overlayWindow.show(); // Ensure visible
        overlayWindow.focus();

        // Send update event
        overlayWindow.webContents.send('context-updated', { selection });
    })();
}

function toggleOverlay() {
    if (!overlayWindow) return;

    // Simple toggle: If visible, hide. If hidden, show.
    if (overlayWindow.isVisible()) {
        hideOverlay();
    } else {
        showOverlay();
    }
}

/**
 * Get the currently selected text by simulating a copy command
 * @returns {Promise<string>} The selected text or empty string
 */
async function getSelectedText() {
    // 1. Store current clipboard content
    const originalClipboard = clipboard.readText();

    // 2. Clear clipboard to detect if copy worked
    clipboard.writeText('');

    // 3. Simulate Cmd+C (macOS) or Ctrl+C (Windows/Linux)
    // We reuse the logic from simulatePaste but for copy
    console.log('[Selection] Simulating copy...');

    await new Promise((resolve) => {
        if (process.platform === 'darwin') {
            exec('osascript -e \'tell application "System Events" to keystroke "c" using command down\'', (error) => {
                if (error) console.error('[Selection] Copy failed:', error.message);
                resolve();
            });
        } else {
            // Basic support for other platforms - likely needs xdotool or similar
            // For now, we'll just try standard Ctrl+C if we can, but main target is macOS
            // Fallback to no-op for now on non-macOS to avoid issues
            resolve();
        }
    });

    // 4. Wait for clipboard to update (short delay)
    await new Promise(resolve => setTimeout(resolve, 100));

    // 5. Read new content
    const selectedText = clipboard.readText();
    console.log(`[Selection] Captured: "${selectedText.substring(0, 20)}..."`);

    // 6. Restore original clipboard if no selection was captured OR if we want to be nice
    // Ideally we want to restore ONLY if we captured something we don't need to keep, 
    // BUT for "Refine", the user might want that text in clipboard anyway. 
    // However, if we FAILED to copy (no selection), we MUST restore original.
    if (!selectedText) {
        console.log('[Selection] No text selected, restoring clipboard');
        clipboard.writeText(originalClipboard);
    } else {
        // If we DID copy text, strictly speaking we destroyed the user's previous clipboard.
        // For a "Refine" feature, users *might* expect the selected text to be in clipboard,
        // but it's cleaner to restore the original state so we don't mess with their workflow.
        // Let's restore for now to be safe and invisible.
        // modifying clipboard is side-effect heavy.

        // Wait a bit more to ensure the app processed the copy command before we overwrite it?
        // Actually, if we read it, we have it. We can restore immediately.
        console.log('[Selection] Restoring original clipboard');
        clipboard.writeText(originalClipboard);
    }

    return selectedText || '';
}

function showOverlay() {
    if (!overlayWindow) return;

    // Capture the frontmost app BEFORE we show our overlay
    previousApp = getFrontmostApp();
    console.log(`[Focus] Captured previous app: "${previousApp}"`);

    // Reset chat session on new overlay show to ensure fresh context
    chatSession = null;
    console.log('[Gemini] Chat session reset');

    // Initialize new memory session
    if (!currentMemorySession) {
        currentMemorySession = {
            id: null, // Will be created in DB if session has interactions
            interactions: [],
            startedAt: new Date().toISOString()
        };
        console.log('[Memory] New session started');
    }

    // START CAPTURE SEQUENCE
    // We need to do this async, so we'll fire and forget the window show logic 
    // inside the async flow, OR just make showOverlay async (but check callers).
    // Let's keep showOverlay sync-ish in signature but run logic async.

    (async () => {
        // Position window first (invisible) so it's ready? 
        // No, stay hidden while capturing.

        // Reposition logic (moved from below)
        const cursorPoint = screen.getCursorScreenPoint();
        const display = screen.getDisplayNearestPoint(cursorPoint);
        const { width, height } = display.bounds;
        const { x: displayX, y: displayY } = display.bounds;
        const windowWidth = 600;
        const windowHeight = 400;

        overlayWindow.setPosition(
            Math.round(displayX + (width - windowWidth) / 2),
            Math.round(displayY + height - windowHeight + 45)
        );

        // Capture selection
        const selection = await getSelectedText();

        // Show window
        overlayWindow.show();
        overlayWindow.focus();

        // Send event with selection
        overlayWindow.webContents.send('window-shown', { selection });
    })();
}

function hideOverlay() {
    if (!overlayWindow) return;
    overlayWindow.hide();
    overlayWindow.webContents.send('window-hidden');
    
    // Note: Session analysis now happens on app quit, not on overlay hide
    // Session persists across multiple overlay open/close cycles
}

// =============================================================================
// Insert Text Flow
// =============================================================================

async function insertText(text) {
    // Copy to clipboard
    clipboard.writeText(text);
    console.log('[Insert] Text copied to clipboard');

    // Hide overlay first
    hideOverlay();

    // Restore focus to the previous app
    if (previousApp) {
        console.log(`[Insert] Restoring focus to "${previousApp}"...`);
        const activated = await activateApp(previousApp);

        if (activated) {
            // Wait for the app to regain focus
            await new Promise(resolve => setTimeout(resolve, FOCUS_RESTORE_DELAY));
        } else {
            console.warn('[Insert] Could not restore focus, paste may not work as expected');
        }
    } else {
        console.warn('[Insert] No previous app recorded, waiting before paste...');
        await new Promise(resolve => setTimeout(resolve, FOCUS_RESTORE_DELAY));
    }

    // Simulate paste
    console.log('[Insert] Simulating paste...');
    const pasted = await simulatePaste();

    if (pasted) {
        console.log('[Insert] Paste simulated successfully');
    } else {
        console.error('[Insert] Paste simulation failed - text is in clipboard, use Cmd+V manually');
    }

    // Clear the previous app reference
    previousApp = null;
}

// =============================================================================
// Global Shortcuts
// =============================================================================

function registerShortcuts() {
    // Overlay toggle: Cmd+/ (macOS) or Ctrl+/ (Windows/Linux)
    const overlayShortcut = process.platform === 'darwin' ? 'Command+/' : 'Control+/';
    const overlayRegistered = globalShortcut.register(overlayShortcut, () => {
        toggleOverlay();
    });

    if (!overlayRegistered) {
        console.error('Failed to register overlay shortcut:', overlayShortcut);
    } else {
        console.log('Overlay shortcut registered:', overlayShortcut);
    }

    // Update Context: Cmd+. (macOS) or Ctrl+. (Windows/Linux)
    const updateContextShortcut = process.platform === 'darwin' ? 'Command+.' : 'Control+.';
    const updateContextRegistered = globalShortcut.register(updateContextShortcut, () => {
        updateOverlayContext();
    });

    if (!updateContextRegistered) {
        console.error('Failed to register update context shortcut:', updateContextShortcut);
    } else {
        console.log('Update context shortcut registered:', updateContextShortcut);
    }

    // Settings: Cmd+Shift+/ (macOS) or Ctrl+Shift+/ (Windows/Linux)
    const settingsShortcut = process.platform === 'darwin' ? 'Command+Shift+/' : 'Control+Shift+/';
    const settingsRegistered = globalShortcut.register(settingsShortcut, () => {
        if (!mainWindow) {
            createMainWindow();
            mainWindow.webContents.on('did-finish-load', () => {
                mainWindow.webContents.send('navigate', 'settings');
            });
        } else {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('navigate', 'settings');
        }
    });

    if (!settingsRegistered) {
        console.error('Failed to register settings shortcut:', settingsShortcut);
    } else {
        console.log('Settings shortcut registered:', settingsShortcut);
    }
}

function unregisterShortcuts() {
    globalShortcut.unregisterAll();
    console.log('Global shortcuts unregistered');
}

// =============================================================================
// Auth & Profile Helpers
// =============================================================================

async function loadUserProfile(userId) {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('[Auth] Failed to load profile:', error.message);
        return null;
    }

    return data;
}

async function transitionToOverlayMode() {
    // Close main window if open
    if (mainWindow) {
        mainWindow.close();
    }

    // Initialize Gemini if not already
    if (!genAI) {
        genAI = initGemini();
    }

    // Create overlay and register shortcuts
    createOverlayWindow();
    registerShortcuts();

    // Keep dock icon visible on macOS for easy access to settings
    if (process.platform === 'darwin') {
        app.dock?.show?.();
    }

    isAuthenticated = true;
    console.log('[Auth] Transitioned to overlay mode');
}

async function transitionToAuthMode() {
    // Destroy overlay if exists
    if (overlayWindow) {
        overlayWindow.destroy();
        overlayWindow = null;
    }

    // Unregister shortcuts
    unregisterShortcuts();

    // Clear user state
    currentUserProfile = null;
    isAuthenticated = false;

    // Show main window
    createMainWindow();

    // Force navigation to auth page
    if (mainWindow) {
        mainWindow.webContents.send('navigate', 'auth');
    }

    console.log('[Auth] Transitioned to auth mode');
}

// =============================================================================
// IPC Handlers
// =============================================================================

function setupIPC() {
    // =========================================================================
    // Existing Overlay Handlers
    // =========================================================================

    ipcMain.handle('generate-text', async (event, prompt, options = {}) => {
        try {
            const { includeScreenshot } = options;
            let screenshotDataUrl = null;

            if (includeScreenshot) {
                console.log('[IPC] Screenshot requested, capturing...');
                const screenshotResult = await captureScreenshot();

                // Check for permission error
                if (screenshotResult && typeof screenshotResult === 'object' && screenshotResult.error) {
                    return { success: false, error: screenshotResult.error };
                }

                screenshotDataUrl = screenshotResult;
            }

            const result = await generateText(prompt, screenshotDataUrl);
            return { success: true, text: result };
        } catch (error) {
            console.error('Generation error:', error);
            return { success: false, error: error.message };
        }
    });

    // Context awareness: check if visual context is needed
    ipcMain.handle('check-context-need', async (event, prompt) => {
        const heuristicResult = checkContextNeed(prompt);
        console.log('[Context Check] Heuristics:', heuristicResult);

        if (heuristicResult.confidence === 'high') {
            return { needsContext: heuristicResult.needsContext, source: 'heuristics' };
        }

        // Low confidence - use LLM
        console.log('[Context Check] Low confidence, consulting LLM...');
        const llmResult = await checkContextWithLLM(prompt);
        return { needsContext: llmResult, source: 'llm' };
    });

    // Screenshot capture
    ipcMain.handle('screenshot:capture', async () => {
        return await captureScreenshot();
    });

    ipcMain.handle('insert-text', async (event, text) => {
        try {
            await insertText(text);
            return { success: true };
        } catch (error) {
            console.error('Insert error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.on('dismiss', () => {
        hideOverlay();
    });

    // =========================================================================
    // Auth Handlers
    // =========================================================================

    ipcMain.handle('auth:sign-up', async (event, { email, password }) => {
        try {
            const { data, error } = await supabase.auth.signUp({ email, password });

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, user: data.user };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('auth:sign-in', async (event, { email, password }) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                return { success: false, error: error.message };
            }

            // Load user profile
            const profile = await loadUserProfile(data.user.id);

            if (profile) {
                currentUserProfile = profile;
            }

            return {
                success: true,
                user: data.user,
                profile,
                needsOnboarding: !profile?.onboarding_completed,
            };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('auth:sign-out', async () => {
        try {
            await supabase.auth.signOut();
            await transitionToAuthMode();
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('auth:get-session', async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            return { success: true, session };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    // =========================================================================
    // Profile Handlers
    // =========================================================================

    ipcMain.handle('profile:get', async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { success: false, error: 'Not authenticated' };
            }

            const profile = await loadUserProfile(user.id);
            if (!profile) {
                return { success: false, error: 'Profile not found' };
            }

            currentUserProfile = profile;
            return { success: true, profile };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('profile:update', async (event, updates) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { success: false, error: 'Not authenticated' };
            }

            const { data, error } = await supabase
                .from('user_profiles')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', user.id)
                .select()
                .single();

            if (error) {
                return { success: false, error: error.message };
            }

            currentUserProfile = data;
            return { success: true, profile: data };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    // =========================================================================
    // Onboarding Handlers
    // =========================================================================

    ipcMain.handle('onboarding:complete', async (event, { displayName, writingStyle, writingStyleGuide }) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { success: false, error: 'Not authenticated' };
            }

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

            if (error) {
                return { success: false, error: error.message };
            }

            currentUserProfile = data;
            await transitionToOverlayMode();

            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('analyze-writing-style', async (event, sampleText) => {
        try {
            if (!genAI) {
                genAI = initGemini();
            }

            if (!genAI) {
                return { success: false, error: 'Gemini API not initialized' };
            }

            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite-preview-02-05' });
            const prompt = `Analyze this writing sample and create a brief style guide (2-3 sentences) that describes the tone, vocabulary level, sentence structure, and any distinctive patterns. Be concise and actionable. The style guide will be used to instruct an AI to write in this person's style.

Writing sample:
"${sampleText}"

Style guide:`;

            const result = await model.generateContent(prompt);
            const styleGuide = result.response.text();

            return { success: true, styleGuide };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    // =========================================================================
    // Usage Stats Handler
    // =========================================================================

    ipcMain.handle('usage:get-stats', async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { success: false, error: 'Not authenticated' };
            }

            const { data, error } = await supabase
                .from('user_profiles')
                .select('tokens_used, tokens_remaining, subscription_tier')
                .eq('id', user.id)
                .single();

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, stats: data };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    // =========================================================================
    // Memory Handlers
    // =========================================================================

    ipcMain.handle('memory:get-all', async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { success: false, error: 'Not authenticated' };
            }

            const { data, error } = await supabase
                .from('user_memories')
                .select('id, content, category, created_at, metadata, is_active')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, memories: data || [] };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('memory:update', async (event, memoryId, content) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { success: false, error: 'Not authenticated' };
            }

            // Regenerate embedding for updated content
            const { embedText } = require('./embedding');
            const embedding = await embedText(content);

            const { data, error } = await supabase
                .from('user_memories')
                .update({
                    content,
                    embedding,
                    updated_at: new Date().toISOString()
                })
                .eq('id', memoryId)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, memory: data };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('memory:delete', async (event, memoryId) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { success: false, error: 'Not authenticated' };
            }

            // Soft delete by setting is_active to false
            const { error } = await supabase
                .from('user_memories')
                .update({ is_active: false })
                .eq('id', memoryId)
                .eq('user_id', user.id);

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('memory:toggle', async (event, enabled) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { success: false, error: 'Not authenticated' };
            }

            const { data, error } = await supabase
                .from('user_profiles')
                .update({ memory_enabled: enabled })
                .eq('id', user.id)
                .select()
                .single();

            if (error) {
                return { success: false, error: error.message };
            }

            // Update local cache
            if (currentUserProfile) {
                currentUserProfile.memory_enabled = enabled;
            }

            return { success: true, profile: data };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('memory:get-stats', async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { success: false, error: 'Not authenticated' };
            }

            // Get total count and breakdown by category
            const { data: memories, error } = await supabase
                .from('user_memories')
                .select('category')
                .eq('user_id', user.id)
                .eq('is_active', true);

            if (error) {
                return { success: false, error: error.message };
            }

            // Get last session date
            const { data: lastSession } = await supabase
                .from('memory_sessions')
                .select('closed_at')
                .eq('user_id', user.id)
                .order('closed_at', { ascending: false })
                .limit(1)
                .single();

            // Calculate stats
            const byCategory = {};
            memories.forEach(m => {
                byCategory[m.category] = (byCategory[m.category] || 0) + 1;
            });

            return {
                success: true,
                stats: {
                    total: memories.length,
                    by_category: byCategory,
                    last_session: lastSession?.closed_at || null
                }
            };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    // =========================================================================
    // Navigation Handler (for main window)
    // =========================================================================

    ipcMain.on('navigate', (event, route) => {
        if (mainWindow) {
            mainWindow.webContents.send('navigate', route);
        }
    });
}

// =============================================================================
// App Lifecycle
// =============================================================================

app.whenReady().then(async () => {
    // Set dock icon immediately on macOS (before showing any windows)
    if (process.platform === 'darwin') {
        app.dock?.setIcon?.(ICON_PATH);
    }

    // Initialize Supabase (async due to electron-store ESM)
    supabase = await createSupabaseClient();

    if (!supabase) {
        console.error('[App] Supabase initialization failed. Showing auth window anyway.');
        createMainWindow();
        setupIPC();
        return;
    }

    // Check for existing session
    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            // Load user profile
            const profile = await loadUserProfile(session.user.id);

            if (profile?.onboarding_completed) {
                // Authenticated + onboarded: enable overlay mode
                currentUserProfile = profile;
                genAI = initGemini();
                createOverlayWindow();
                registerShortcuts();
                isAuthenticated = true;

                // Keep dock icon visible on macOS for easy access to settings
                if (process.platform === 'darwin') {
                    app.dock?.show?.();
                }

                console.log('[App] Restored session, overlay mode active. Press Cmd+/ to open.');
            } else {
                // Needs onboarding
                currentUserProfile = profile;
                createMainWindow();
                // Navigate to onboarding after window loads
                mainWindow.webContents.on('did-finish-load', () => {
                    mainWindow.webContents.send('navigate', 'onboarding-1');
                });
            }
        } else {
            // Not authenticated: show main window (auth page)
            createMainWindow();
        }
    } catch (err) {
        console.error('[App] Session check failed:', err.message);
        createMainWindow();
    }

    setupIPC();
});

// Analyze memory session before app quits
app.on('before-quit', async (event) => {
    // Only analyze if we have a session with enough interactions
    if (currentMemorySession && currentMemorySession.interactions.length >= 2) {
        console.log(`[Memory] Analyzing session before app quit (${currentMemorySession.interactions.length} interactions)`);
        
        // Prevent quit temporarily to finish analysis
        event.preventDefault();
        
        try {
            await analyzeSessionForMemories(currentMemorySession);
            console.log('[Memory] Session analysis complete, app will now quit');
        } catch (error) {
            console.error('[Memory] Session analysis failed:', error.message);
        } finally {
            currentMemorySession = null;
            // Now actually quit
            app.quit();
        }
    }
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
    // On macOS, don't quit when all windows closed if overlay is active
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // Dock icon clicked
    if (isAuthenticated && currentUserProfile?.onboarding_completed) {
        // Show settings window
        if (!mainWindow) {
            createMainWindow();
            mainWindow.webContents.on('did-finish-load', () => {
                mainWindow.webContents.send('navigate', 'settings');
            });
        } else {
            mainWindow.show();
            mainWindow.focus();
        }
    } else {
        // Show auth/onboarding window
        if (!mainWindow) {
            createMainWindow();
        }
    }
});
