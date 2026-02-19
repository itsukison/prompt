const { autoUpdater } = require('electron-updater');

// Deferred state — held until a mainWindow is ready to receive the event
let pendingAvailableInfo = null;
let pendingReadyInfo = null;
let pendingError = null;

// Version carried from update-available so progress events always include it
let availableVersion = null;

/**
 * Set up electron-updater.  Call once from app.whenReady().
 * Does NOT call checkForUpdates() immediately — uses a 5-second delay so all
 * IPC handlers and windows are initialised first.  Also works in overlay-only
 * mode where no mainWindow exists at startup.
 *
 * @param {() => object} getAppState  — returns the live appState proxy
 */
function initUpdater(getAppState) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    // Helper: send to mainWindow only when it exists and is live
    const send = (channel, data) => {
        const win = getAppState().mainWindow;
        if (win && !win.isDestroyed()) {
            win.webContents.send(channel, data);
        }
    };

    autoUpdater.on('update-available', (info) => {
        availableVersion = info.version;
        pendingAvailableInfo = info;
        pendingReadyInfo = null;  // clear stale ready state from a previous cycle
        pendingError = null;
        console.log(`[Updater] Update available: v${info.version}`);
        send('update:available', info);
    });

    autoUpdater.on('download-progress', (progress) => {
        send('update:progress', { percent: progress.percent, version: availableVersion });
    });

    autoUpdater.on('update-downloaded', (info) => {
        pendingReadyInfo = info;
        pendingError = null;
        console.log(`[Updater] Update downloaded: v${info.version}`);
        send('update:ready', info);
    });

    autoUpdater.on('error', (err) => {
        console.error('[Updater] Error:', err.message);
        pendingError = { message: err.message };
        send('update:error', { message: err.message });
    });

    // Delay first check — avoids firing before any renderer is ready
    setTimeout(() => {
        autoUpdater.checkForUpdates().catch((err) => {
            console.error('[Updater] Check failed:', err.message);
        });
    }, 5000);

    // Periodic check for long-running sessions (every 4 hours)
    setInterval(() => {
        autoUpdater.checkForUpdates().catch((err) => {
            console.error('[Updater] Periodic check failed:', err.message);
        });
    }, 4 * 60 * 60 * 1000);
}

/**
 * Replay any pending update state to a newly-loaded mainWindow.
 * Call this inside a `did-finish-load` handler every time a new mainWindow is created.
 *
 * @param {import('electron').BrowserWindow} win
 */
function flushPendingUpdate(win) {
    if (!win || win.isDestroyed()) return;

    if (pendingReadyInfo) {
        win.webContents.send('update:ready', pendingReadyInfo);
    } else if (pendingAvailableInfo) {
        win.webContents.send('update:available', pendingAvailableInfo);
    } else if (pendingError) {
        win.webContents.send('update:error', pendingError);
    }
}

/**
 * Trigger install immediately (called from the IPC handler).
 */
function installUpdate() {
    autoUpdater.quitAndInstall();
}

module.exports = { initUpdater, flushPendingUpdate, installUpdate };
