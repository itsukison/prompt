const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('promptOS', {
    // =========================================================================
    // Overlay Functions (existing)
    // =========================================================================

    // Generate text using Gemini
    generate: (prompt) => ipcRenderer.invoke('generate-text', prompt),

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
    // Navigation (for main window routing)
    // =========================================================================

    onNavigate: (callback) => {
        ipcRenderer.on('navigate', (_, route) => callback(route));
        return () => ipcRenderer.removeListener('navigate', callback);
    },
});
