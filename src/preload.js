const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('promptOS', {
    // =========================================================================
    // Overlay Functions (existing)
    // =========================================================================

    // Generate text using Gemini (with optional screenshot)
    generate: (prompt, options) => ipcRenderer.invoke('generate-text', prompt, options),

    // Cancel current generation
    cancelGeneration: () => ipcRenderer.invoke('cancel-text-generation'),

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
        onLanguageChanged: (callback) => {
            ipcRenderer.on('language-changed', (_, lang) => callback(lang));
            return () => ipcRenderer.removeListener('language-changed', callback);
        },
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
    // Facts Functions (simplified 10-fact memory system)
    // =========================================================================

    facts: {
        getAll: () => ipcRenderer.invoke('facts:get-all'),
        add: (content) => ipcRenderer.invoke('facts:add', content),
        update: (factId, content) => ipcRenderer.invoke('facts:update', factId, content),
        delete: (factId) => ipcRenderer.invoke('facts:delete', factId),
        toggle: (enabled) => ipcRenderer.invoke('facts:toggle', enabled),
        getStats: () => ipcRenderer.invoke('facts:get-stats'),
    },

    // =========================================================================
    // Memory Functions (deprecated - use facts instead, kept for compatibility)
    // =========================================================================

    memory: {
        getAll: () => ipcRenderer.invoke('memory:get-all'),
        add: (content, category) => ipcRenderer.invoke('memory:add', content, category),
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

    openSystemSettings: (pane) => ipcRenderer.invoke('open-system-settings', pane),

    // =========================================================================
    // Auto-update
    // =========================================================================

    update: {
        onAvailable: (callback) => {
            ipcRenderer.on('update:available', (_, info) => callback(info));
            return () => ipcRenderer.removeAllListeners('update:available');
        },
        onProgress: (callback) => {
            ipcRenderer.on('update:progress', (_, data) => callback(data));
            return () => ipcRenderer.removeAllListeners('update:progress');
        },
        onReady: (callback) => {
            ipcRenderer.on('update:ready', (_, info) => callback(info));
            return () => ipcRenderer.removeAllListeners('update:ready');
        },
        onError: (callback) => {
            ipcRenderer.on('update:error', (_, data) => callback(data));
            return () => ipcRenderer.removeAllListeners('update:error');
        },
        install: () => ipcRenderer.invoke('update:install'),
    },
});
