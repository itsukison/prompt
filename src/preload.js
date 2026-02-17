const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('promptOS', {
    // =========================================================================
    // Overlay Functions (existing)
    // =========================================================================

    // Generate text using Gemini (with optional screenshot)
    generate: (prompt, options) => ipcRenderer.invoke('generate-text', prompt, options),

    // Check if visual context is needed for a prompt
    checkContextNeed: (prompt) => ipcRenderer.invoke('check-context-need', prompt),

    // Screenshot capture
    screenshot: {
        capture: () => ipcRenderer.invoke('screenshot:capture'),
    },

    // Insert text into the previously focused app
    insert: (text) => ipcRenderer.invoke('insert-text', text),

    // Dismiss the overlay
    dismiss: () => ipcRenderer.send('dismiss'),

    // Set window height
    setHeight: (height) => ipcRenderer.send('set-height', height),

    // Listen for window events
    onWindowShown: (callback) => {
        ipcRenderer.on('window-shown', (_, payload) => callback(payload));
        return () => ipcRenderer.removeListener('window-shown', callback);
    },

    onWindowHidden: (callback) => {
        ipcRenderer.on('window-hidden', callback);
        return () => ipcRenderer.removeListener('window-hidden', callback);
    },

    onContextUpdated: (callback) => {
        ipcRenderer.on('context-updated', (_, payload) => callback(payload));
        return () => ipcRenderer.removeListener('context-updated', callback);
    },

    // Listen for generation status updates (retries, etc.)
    onGenerationStatus: (callback) => {
        ipcRenderer.on('generation-status', (_, status) => callback(status));
        return () => ipcRenderer.removeListener('generation-status', callback);
    },

    // =========================================================================
    // Auth Functions
    // =========================================================================

    auth: {
        signUp: (credentials) => ipcRenderer.invoke('auth:sign-up', credentials),
        signIn: (credentials) => ipcRenderer.invoke('auth:sign-in', credentials),
        signOut: () => ipcRenderer.invoke('auth:sign-out'),
        getSession: () => ipcRenderer.invoke('auth:get-session'),
    },

    // =========================================================================
    // Profile Functions
    // =========================================================================

    profile: {
        get: () => ipcRenderer.invoke('profile:get'),
        update: (updates) => ipcRenderer.invoke('profile:update', updates),
    },

    // =========================================================================
    // Onboarding Functions
    // =========================================================================

    onboarding: {
        complete: (data) => ipcRenderer.invoke('onboarding:complete', data),
        analyzeStyle: (sampleText) => ipcRenderer.invoke('analyze-writing-style', sampleText),
    },

    // =========================================================================
    // Usage Functions
    // =========================================================================

    usage: {
        getStats: () => ipcRenderer.invoke('usage:get-stats'),
    },

    // =========================================================================
    // Memory Functions
    // =========================================================================

    memory: {
        getAll: () => ipcRenderer.invoke('memory:get-all'),
        update: (memoryId, content) => ipcRenderer.invoke('memory:update', memoryId, content),
        delete: (memoryId) => ipcRenderer.invoke('memory:delete', memoryId),
        toggle: (enabled) => ipcRenderer.invoke('memory:toggle', enabled),
        getStats: () => ipcRenderer.invoke('memory:get-stats'),
    },

    // =========================================================================
    // Navigation (for main window routing)
    // =========================================================================

    onNavigate: (callback) => {
        ipcRenderer.on('navigate', (_, route) => callback(route));
        return () => ipcRenderer.removeListener('navigate', callback);
    },
});
