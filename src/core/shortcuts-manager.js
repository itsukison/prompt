const { globalShortcut } = require('electron');
const { IS_MAC } = require('../utils/platform');

/**
 * Register all global shortcuts
 * @param {object} handlers - { onToggleOverlay, onUpdateContext, onOpenSettings }
 */
function registerShortcuts({ onToggleOverlay, onUpdateContext, onOpenSettings }) {
    const overlayShortcut = IS_MAC ? 'Command+/' : 'Control+/';
    const registered = globalShortcut.register(overlayShortcut, onToggleOverlay);
    if (!registered) {
        console.error('Failed to register overlay shortcut:', overlayShortcut);
    } else {
        console.log('Overlay shortcut registered:', overlayShortcut);
    }

    const updateContextShortcut = IS_MAC ? 'Command+.' : 'Control+.';
    const updateRegistered = globalShortcut.register(updateContextShortcut, onUpdateContext);
    if (!updateRegistered) {
        console.error('Failed to register update context shortcut:', updateContextShortcut);
    } else {
        console.log('Update context shortcut registered:', updateContextShortcut);
    }

    const settingsShortcut = IS_MAC ? 'Command+Shift+/' : 'Control+Shift+/';
    const settingsRegistered = globalShortcut.register(settingsShortcut, onOpenSettings);
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

module.exports = { registerShortcuts, unregisterShortcuts };
