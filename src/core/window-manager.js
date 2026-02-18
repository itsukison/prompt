const { BrowserWindow, app, screen } = require('electron');
const path = require('path');
const { IS_MAC } = require('../utils/platform');

const ICON_PATH = path.join(__dirname, '..', '..', 'public', 'logo.png');

/**
 * Create or show the main settings/auth window
 * @param {BrowserWindow|null} existingWindow
 * @returns {BrowserWindow}
 */
function createMainWindow(existingWindow) {
    if (existingWindow) {
        existingWindow.show();
        existingWindow.focus();
        return existingWindow;
    }

    const mainWindow = new BrowserWindow({
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
        icon: ICON_PATH,
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    mainWindow.loadFile(path.join(__dirname, '..', '..', 'dist', 'renderer', 'main-window.html'));

    if (IS_MAC) {
        app.dock?.show?.();
        app.dock?.setIcon?.(ICON_PATH);
    }

    return mainWindow;
}

/**
 * Create the always-on-top transparent overlay window
 * @returns {BrowserWindow}
 */
function createOverlayWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const windowWidth = 600;
    const windowHeight = 400;

    const overlayWindow = new BrowserWindow({
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
        icon: ICON_PATH,
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    overlayWindow.loadFile(path.join(__dirname, '..', '..', 'dist', 'renderer', 'index.html'));

    if (IS_MAC) {
        overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        overlayWindow.setHiddenInMissionControl(true);
    }

    return overlayWindow;
}

/**
 * Show the overlay, positioned near the cursor's display
 * @param {BrowserWindow} overlayWindow
 * @param {string} selection - selected text to send with window-shown event
 */
function showOverlay(overlayWindow, selection) {
    if (!overlayWindow) return;

    const cursorPoint = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursorPoint);
    const { x: displayX, y: displayY, width, height } = display.workArea;
    const windowWidth = 600;
    const windowHeight = 400;

    overlayWindow.setPosition(
        Math.round(displayX + (width - windowWidth) / 2),
        Math.round(displayY + height - windowHeight + 45)
    );

    overlayWindow.show();
    overlayWindow.focus();
    overlayWindow.webContents.send('window-shown', { selection });
}

/**
 * Hide the overlay window
 * @param {BrowserWindow} overlayWindow
 */
function hideOverlay(overlayWindow) {
    if (!overlayWindow) return;
    overlayWindow.hide();
    overlayWindow.webContents.send('window-hidden');
}

/**
 * Re-capture the frontmost app and send updated context to overlay
 * @param {BrowserWindow} overlayWindow
 * @param {Function} getFrontmostApp
 * @param {Function} getSelectedText
 * @param {Electron.Clipboard} clipboard
 * @returns {Promise<string|null>} the updated previousApp name
 */
async function updateOverlayContext(overlayWindow, getFrontmostApp, getSelectedText, clipboard) {
    if (!overlayWindow || !overlayWindow.isVisible()) {
        console.log('[Overlay] Not visible, ignoring context update request');
        return null;
    }
    const previousApp = getFrontmostApp();
    console.log(`[Focus] Re-captured previous app during update: "${previousApp}"`);
    const selection = await getSelectedText(clipboard);
    overlayWindow.show();
    overlayWindow.focus();
    overlayWindow.webContents.send('context-updated', { selection });
    return previousApp;
}

module.exports = { createMainWindow, createOverlayWindow, showOverlay, hideOverlay, updateOverlayContext, ICON_PATH };
