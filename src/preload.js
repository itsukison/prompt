const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('promptOS', {
    // Generate text using Gemini
    generate: (prompt) => ipcRenderer.invoke('generate-text', prompt),

    // Insert text into the previously focused app
    insert: (text) => ipcRenderer.invoke('insert-text', text),

    // Dismiss the overlay
    dismiss: () => ipcRenderer.send('dismiss'),

    // Listen for window events
    onWindowShown: (callback) => {
        ipcRenderer.on('window-shown', callback);
        return () => ipcRenderer.removeListener('window-shown', callback);
    },

    onWindowHidden: (callback) => {
        ipcRenderer.on('window-hidden', callback);
        return () => ipcRenderer.removeListener('window-hidden', callback);
    }
});
