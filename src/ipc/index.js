const { ipcMain, shell, clipboard } = require('electron');
const { setupAuthHandlers } = require('./auth-handlers');
const { setupProfileHandlers } = require('./profile-handlers');
const { setupMemoryHandlers } = require('./memory-handlers');
const { setupGenerationHandlers } = require('./generation-handlers');
const { setupUsageHandlers } = require('./usage-handlers');
const { setupBillingHandlers } = require('./billing-handlers');
const { IS_MAC } = require('../utils/platform');
const { ok, fail } = require('../utils/ipc-response');
const { installUpdate } = require('../core/updater');

/**
 * Register all IPC handlers
 * @param {object} deps - shared dependencies passed to all handler modules
 */
function setupIPC(deps) {
    setupGenerationHandlers(deps);
    setupAuthHandlers(deps);
    setupProfileHandlers(deps);
    setupMemoryHandlers(deps);
    setupUsageHandlers(deps);
    setupBillingHandlers(deps);

    // Insert text: copy to clipboard, restore focus, paste
    ipcMain.handle('insert-text', async (event, text) => {
        try {
            const FOCUS_RESTORE_DELAY = 200;
            const state = deps.getAppState();
            const { hideOverlay } = require('../core/window-manager');
            const { activateApp, simulatePaste } = require('../services/focus-service');

            clipboard.writeText(text);
            console.log('[Insert] Text copied to clipboard');
            hideOverlay(state.overlayWindow);

            if (state.previousApp) {
                console.log(`[Insert] Restoring focus to "${state.previousApp}"...`);
                const activated = await activateApp(state.previousApp);
                if (!activated) console.warn('[Insert] Could not restore focus, paste may not work as expected');
                await new Promise(resolve => setTimeout(resolve, FOCUS_RESTORE_DELAY));
            } else {
                await new Promise(resolve => setTimeout(resolve, FOCUS_RESTORE_DELAY));
            }

            const pasted = await simulatePaste();
            if (pasted) {
                console.log('[Insert] Paste simulated successfully');
            } else {
                const pasteKey = IS_MAC ? 'Cmd+V' : 'Ctrl+V';
                console.error(`[Insert] Paste simulation failed - text is in clipboard, use ${pasteKey} manually`);
            }
            state.previousApp = null; // cleared via setter on appState proxy
            return ok();
        } catch (error) {
            console.error('Insert error:', error);
            return fail(error.message);
        }
    });

    // Open main settings window (used from overlay)
    ipcMain.handle('open-settings-window', async () => {
        if (deps.openSettings) deps.openSettings();
    });

    // Open main settings window directly on the Billing tab
    ipcMain.handle('open-billing-settings', async () => {
        if (deps.openSettingsBilling) deps.openSettingsBilling();
        else if (deps.openSettings) deps.openSettings();
    });

    // Open macOS System Settings pane
    ipcMain.handle('open-system-settings', async (event, pane) => {
        if (pane === 'screen-recording' && IS_MAC) {
            await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
        }
    });

    // Navigation relay (main window routing)
    ipcMain.on('navigate', (event, route) => {
        const state = deps.getAppState();
        if (state.mainWindow) {
            state.mainWindow.webContents.send('navigate', route);
        }
    });

    // Overlay dismiss
    ipcMain.on('dismiss', () => {
        const state = deps.getAppState();
        const { hideOverlay } = require('../core/window-manager');
        hideOverlay(state.overlayWindow);
    });

    // Install downloaded update and relaunch
    ipcMain.handle('update:install', () => {
        installUpdate();
    });
}

module.exports = { setupIPC };
