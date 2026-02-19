const { app, clipboard, desktopCapturer } = require('electron');
const path = require('path');
require('dotenv').config({
    path: app.isPackaged
        ? path.join(process.resourcesPath, '.env')
        : path.join(__dirname, '../.env')
});

const { createSupabaseClient } = require('./supabase');
const { initGemini } = require('./services/gemini-service');
const { initGrok } = require('./services/grok-service');
const { loadUserProfile } = require('./services/auth-service');
const { analyzeSessionForFacts } = require('./services/memory-service');
const { getFrontmostApp, getSelectedText, getBrowserContext } = require('./services/focus-service');
const { createMainWindow, createOverlayWindow, showOverlay, hideOverlay, updateOverlayContext, ICON_PATH } = require('./core/window-manager');
const { registerShortcuts, unregisterShortcuts } = require('./core/shortcuts-manager');
const { setupIPC } = require('./ipc/index');
const { initUpdater, flushPendingUpdate } = require('./core/updater');
const { IS_MAC } = require('./utils/platform');

// =============================================================================
// App State
// =============================================================================

let overlayWindow = null;
let mainWindow = null;
let genAI = null;
let grokAI = null;
let supabase = null;
let chatSessionRef = { current: null }; // Mutable ref passed to gemini-service
let previousApp = null;
let previousWindow = null;
let previousBrowserContext = null;
let currentUserProfile = null;
let isAuthenticated = false;
let currentMemorySession = null;

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) app.quit();

// Stable state object — passed by reference so IPC handlers can read/write live state
const appState = {
    get overlayWindow() { return overlayWindow; },
    get mainWindow() { return mainWindow; },
    get genAI() { return genAI; },
    set genAI(v) { genAI = v; },
    get grokAI() { return grokAI; },
    set grokAI(v) { grokAI = v; },
    get supabase() { return supabase; },
    get chatSessionRef() { return chatSessionRef; },
    get previousApp() { return previousApp; },
    set previousApp(v) { previousApp = v; },
    get previousWindow() { return previousWindow; },
    set previousWindow(v) { previousWindow = v; },
    get previousBrowserContext() { return previousBrowserContext; },
    get currentUserProfile() { return currentUserProfile; },
    set currentUserProfile(v) { currentUserProfile = v; },
    get isAuthenticated() { return isAuthenticated; },
    get currentMemorySession() { return currentMemorySession; },
};

function getAppState() { return appState; }

// =============================================================================
// Auth Mode Transitions
// =============================================================================

async function transitionToOverlayMode() {
    if (mainWindow) { mainWindow.close(); mainWindow = null; }
    if (!genAI) genAI = initGemini();
    if (!grokAI) grokAI = initGrok();

    overlayWindow = createOverlayWindow();
    registerShortcuts({
        onToggleOverlay: toggleOverlay,
        onUpdateContext: () => handleUpdateContext(),
        onOpenSettings: openSettings,
    });

    if (IS_MAC) app.dock?.show?.();
    isAuthenticated = true;
    console.log('[Auth] Transitioned to overlay mode');
}

async function transitionToAuthMode() {
    if (overlayWindow) { overlayWindow.destroy(); overlayWindow = null; }
    unregisterShortcuts();
    currentUserProfile = null;
    isAuthenticated = false;
    chatSessionRef.current = null;
    mainWindow = createMainWindow(null);
    mainWindow.on('closed', () => { mainWindow = null; });
    mainWindow.webContents.on('did-finish-load', () => flushPendingUpdate(mainWindow));
    mainWindow.webContents.send('navigate', 'auth');
    console.log('[Auth] Transitioned to auth mode');
}

// =============================================================================
// Overlay Control
// =============================================================================

async function handleShowOverlay() {
    const { appName, windowTitle } = getFrontmostApp();
    previousApp = appName;
    previousWindow = windowTitle;
    console.log(`[Focus] Captured previous app: "${previousApp}", window: "${previousWindow}"`);
    previousBrowserContext = getBrowserContext(previousApp);
    chatSessionRef.current = null;

    if (!currentMemorySession) {
        currentMemorySession = { id: null, interactions: [], startedAt: new Date().toISOString() };
        console.log('[Memory] New session started');
    }

    const selection = await getSelectedText(clipboard);
    showOverlay(overlayWindow, selection);
}

async function handleUpdateContext() {
    const result = await updateOverlayContext(overlayWindow, getFrontmostApp, getSelectedText, clipboard);
    if (result) {
        previousApp = result.appName ?? previousApp;
        previousWindow = result.windowTitle ?? previousWindow;
    }
    previousBrowserContext = getBrowserContext(previousApp);
}

function toggleOverlay() {
    if (!overlayWindow) return;
    if (overlayWindow.isVisible()) {
        hideOverlay(overlayWindow);
    } else {
        handleShowOverlay();
    }
}

function openSettings() {
    if (!mainWindow) {
        mainWindow = createMainWindow(null);
        mainWindow.on('closed', () => { mainWindow = null; });
        mainWindow.webContents.on('did-finish-load', () => {
            mainWindow.webContents.send('navigate', 'settings');
            flushPendingUpdate(mainWindow);
        });
    } else {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('navigate', 'settings');
    }
}

// =============================================================================
// App Lifecycle
// =============================================================================

app.whenReady().then(async () => {
    if (IS_MAC) app.dock?.setIcon?.(ICON_PATH);

    supabase = await createSupabaseClient();

    if (!supabase) {
        console.error('[App] Supabase initialization failed. Showing auth window anyway.');
        mainWindow = createMainWindow(null);
        mainWindow.on('closed', () => { mainWindow = null; });
        mainWindow.webContents.on('did-finish-load', () => flushPendingUpdate(mainWindow));
        setupIPC({ desktopCapturer, supabase, getAppState, transitionToOverlayMode, transitionToAuthMode });
        if (app.isPackaged) initUpdater(getAppState);
        return;
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            const profile = await loadUserProfile(supabase, session.user.id);

            if (profile?.onboarding_completed) {
                currentUserProfile = profile;
                genAI = initGemini();
                grokAI = initGrok();
                overlayWindow = createOverlayWindow();
                registerShortcuts({
                    onToggleOverlay: toggleOverlay,
                    onUpdateContext: () => handleUpdateContext(),
                    onOpenSettings: openSettings,
                });
                isAuthenticated = true;
                if (IS_MAC) app.dock?.show?.();
                console.log('[App] Restored session, overlay mode active. Press Cmd+/ to open.');
            } else {
                currentUserProfile = profile;
                mainWindow = createMainWindow(null);
                mainWindow.on('closed', () => { mainWindow = null; });
                mainWindow.webContents.on('did-finish-load', () => {
                    mainWindow.webContents.send('navigate', 'onboarding-1');
                    flushPendingUpdate(mainWindow);
                });
            }
        } else {
            mainWindow = createMainWindow(null);
            mainWindow.on('closed', () => { mainWindow = null; });
            mainWindow.webContents.on('did-finish-load', () => flushPendingUpdate(mainWindow));
        }
    } catch (err) {
        console.error('[App] Session check failed:', err.message);
        mainWindow = createMainWindow(null);
        mainWindow.on('closed', () => { mainWindow = null; });
        mainWindow.webContents.on('did-finish-load', () => flushPendingUpdate(mainWindow));
    }

    setupIPC({ desktopCapturer, supabase, getAppState, transitionToOverlayMode, transitionToAuthMode });
    if (app.isPackaged) initUpdater(getAppState);

    // Warm up screen recording API to avoid false permission errors on first real use
    if (IS_MAC) {
        setTimeout(async () => {
            try {
                const warmupSources = await desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 1, height: 1 } });
                console.log('[Screenshot] Screen recording API warmed up, got', warmupSources.length, 'sources');
            } catch (e) {
                console.error('[Screenshot] Warmup FAILED:', e.message);
                console.error('[Screenshot] Warmup stack:', e.stack);
            }
        }, 2000);
    }
});

app.on('before-quit', async (event) => {
    if (currentMemorySession && currentMemorySession.interactions.length >= 2) {
        console.log(`[Facts] Analyzing session before app quit (${currentMemorySession.interactions.length} interactions)`);
        event.preventDefault();
        try {
            await analyzeSessionForFacts(genAI, supabase, currentUserProfile, currentMemorySession);
            console.log('[Facts] Session analysis complete, app will now quit');
        } catch (error) {
            console.error('[Facts] Session analysis failed:', error.message);
        } finally {
            currentMemorySession = null;
            app.quit();
        }
    }
});

app.on('will-quit', () => { unregisterShortcuts(); });

app.on('window-all-closed', () => {
    if (!IS_MAC) app.quit();
});

app.on('activate', () => {
    if (isAuthenticated && currentUserProfile?.onboarding_completed) {
        if (!mainWindow) {
            mainWindow = createMainWindow(null);
            mainWindow.on('closed', () => { mainWindow = null; });
            mainWindow.webContents.on('did-finish-load', () => {
                mainWindow.webContents.send('navigate', 'settings');
                flushPendingUpdate(mainWindow);
            });
        } else {
            mainWindow.show();
            mainWindow.focus();
        }
    } else {
        if (!mainWindow) {
            mainWindow = createMainWindow(null);
            mainWindow.on('closed', () => { mainWindow = null; });
            mainWindow.webContents.on('did-finish-load', () => flushPendingUpdate(mainWindow));
        }
    }
});
