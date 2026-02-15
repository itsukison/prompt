const { app, BrowserWindow, globalShortcut, ipcMain, clipboard, screen } = require('electron');
const path = require('path');
const { exec, execSync } = require('child_process');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// =============================================================================
// Configuration
// =============================================================================
const FOCUS_RESTORE_DELAY = 200; // ms to wait after restoring focus before pasting

// =============================================================================
// State
// =============================================================================
let overlayWindow = null;
let genAI = null;
let previousApp = null; // Store the app that was focused before we showed the overlay

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
            console.error('[Focus] ⚠️  Accessibility permissions may be required.');
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

        const script = `tell application "${appName}" to activate`;
        exec(`osascript -e '${script}'`, (error) => {
            if (error) {
                console.error(`[Focus] Failed to activate "${appName}":`, error.message);
                if (error.message.includes('not allowed') || error.message.includes('accessibility')) {
                    console.error('[Focus] ⚠️  Accessibility permissions may be required.');
                    console.error('[Focus] Go to System Settings > Privacy & Security > Accessibility and enable this app.');
                }
                resolve(false);
            } else {
                console.log(`[Focus] Activated "${appName}"`);
                resolve(true);
            }
        });
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
                        console.error('[Paste] ⚠️  Accessibility permissions required for keystroke simulation.');
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

async function generateText(prompt) {
    if (!genAI) {
        throw new Error('Gemini API not initialized. Check your GEMINI_API_KEY.');
    }

    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: 'You are a helpful writing assistant. Generate concise, well-written text based on the user\'s request. Output only the requested text, no explanations or meta-commentary. Match the tone and style appropriate for the request.'
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

// =============================================================================
// Window Management
// =============================================================================

function createOverlayWindow() {
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

function toggleOverlay() {
    if (!overlayWindow) return;

    if (overlayWindow.isVisible()) {
        hideOverlay();
    } else {
        showOverlay();
    }
}

function showOverlay() {
    if (!overlayWindow) return;

    // Capture the frontmost app BEFORE we show our overlay
    previousApp = getFrontmostApp();
    console.log(`[Focus] Captured previous app: "${previousApp}"`);

    // Reposition to current screen
    const cursorPoint = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursorPoint);
    // Use bounds as requested by user manually in Step 185
    const { width, height } = display.bounds;
    const { x: displayX, y: displayY } = display.bounds;

    const windowWidth = 600;
    const windowHeight = 400;

    overlayWindow.setPosition(
        Math.round(displayX + (width - windowWidth) / 2),
        Math.round(displayY + height - windowHeight + 45)
    );

    overlayWindow.show();
    overlayWindow.focus();
    overlayWindow.webContents.send('window-shown');
}

function hideOverlay() {
    if (!overlayWindow) return;
    overlayWindow.hide();
    overlayWindow.webContents.send('window-hidden');
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
    const shortcut = process.platform === 'darwin' ? 'Command+/' : 'Control+/';

    const registered = globalShortcut.register(shortcut, () => {
        toggleOverlay();
    });

    if (!registered) {
        console.error('Failed to register global shortcut:', shortcut);
    } else {
        console.log('Global shortcut registered:', shortcut);
    }
}

// =============================================================================
// IPC Handlers
// =============================================================================

function setupIPC() {
    ipcMain.handle('generate-text', async (event, prompt) => {
        try {
            const result = await generateText(prompt);
            return { success: true, text: result };
        } catch (error) {
            console.error('Generation error:', error);
            return { success: false, error: error.message };
        }
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
}

// =============================================================================
// App Lifecycle
// =============================================================================

app.whenReady().then(() => {
    genAI = initGemini();
    createOverlayWindow();
    registerShortcuts();
    setupIPC();

    console.log('promptOS is running. Press Cmd+/ (macOS) or Ctrl+/ (Windows/Linux) to open.');
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createOverlayWindow();
    }
});
