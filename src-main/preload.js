/**
 * STAMPS Bulk Generator - Electron Preload Script
 * Secure bridge between main process and renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // File dialogs
    openExcelDialog: () => ipcRenderer.invoke('dialog:openExcel'),
    openAttachmentsDialog: () => ipcRenderer.invoke('dialog:openAttachments'),
    saveXmlDialog: (defaultName) => ipcRenderer.invoke('dialog:saveXml', defaultName),
    openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),

    // App info
    getVersion: () => ipcRenderer.invoke('app:getVersion'),

    // Licensing
    getLicenseStatus: () => ipcRenderer.invoke('license:status'),
    activateLicense: (key) => ipcRenderer.invoke('license:activate', key),

    // Shell operations
    showItemInFolder: (path) => ipcRenderer.invoke('shell:showItemInFolder', path),
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

    // Updates
    installUpdate: () => ipcRenderer.invoke('update:install'),
    onUpdateAvailable: (callback) => ipcRenderer.on('update:available', callback),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update:downloaded', callback),

    // Check if running in Electron
    isElectron: true
});
