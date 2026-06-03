/**
 * STAMPS Bulk Generator - Electron Main Process
 * Desktop application entry point
 */

// Diagnostic: Check process type
console.log('Process type:', process.type);
console.log('Process versions:', process.versions);

const electronModule = require('electron');
console.log('Electron module type:', typeof electronModule);
console.log('Electron module:', electronModule);

const { app, BrowserWindow, ipcMain, dialog, shell } = electronModule;

const path = require('path');

// Keep a global reference of the window object
let mainWindow = null;
let server = null;
let autoUpdater = null;

// Server configuration
const PORT = 3847;

function createWindow() {
    console.log('Creating window...');

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        icon: path.join(__dirname, '../assets/icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        show: false,
        backgroundColor: '#0a0a0a'
    });

    // Load the app directly from local file (serverless mode)
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        console.log('Window shown');

        // Check for updates (silent) - only in production
        if (app.isPackaged) {
            initAutoUpdater();
        } else {
            console.log('Development mode - skipping auto-update check');
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Open external links in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

function startServer() {
    try {
        console.log('Starting server...');
        const serverModule = require('../server.js');
        server = serverModule.startServer(PORT);
        console.log(`Server started on port ${PORT}`);
    } catch (error) {
        console.error('Failed to start server:', error);
    }
}

function initAutoUpdater() {
    try {
        autoUpdater = require('electron-updater').autoUpdater;

        autoUpdater.on('update-available', () => {
            mainWindow?.webContents.send('update:available');
        });

        autoUpdater.on('update-downloaded', () => {
            mainWindow?.webContents.send('update:downloaded');
        });

        autoUpdater.on('error', (error) => {
            console.error('Auto-updater error:', error);
        });

        autoUpdater.checkForUpdatesAndNotify();
    } catch (error) {
        console.error('Failed to initialize auto-updater:', error);
    }
}

// App lifecycle
console.log('Setting up app lifecycle...');

app.whenReady().then(() => {
    console.log('App is ready');
    createWindow();
});

app.on('window-all-closed', () => {
    console.log('All windows closed');
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('before-quit', () => {
    console.log('Before quit - closing server');
    if (server) {
        server.close();
    }
});

// ============ IPC Handlers ============

// Open file dialog for Excel files
ipcMain.handle('dialog:openExcel', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Excel or CSV File',
        filters: [
            { name: 'Spreadsheets', extensions: ['xlsx', 'xls', 'csv'] }
        ],
        properties: ['openFile']
    });

    if (result.canceled) {
        return null;
    }
    return result.filePaths[0];
});

// Open file dialog for PDF/image attachments
ipcMain.handle('dialog:openAttachments', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Attachment Files',
        filters: [
            { name: 'Documents & Images', extensions: ['pdf', 'jpg', 'jpeg', 'png'] }
        ],
        properties: ['openFile', 'multiSelections']
    });

    if (result.canceled) {
        return [];
    }
    return result.filePaths;
});

// Save file dialog for XML output
ipcMain.handle('dialog:saveXml', async (event, defaultName) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save XML File',
        defaultPath: defaultName || 'stamps_output.xml',
        filters: [
            { name: 'XML Files', extensions: ['xml'] }
        ]
    });

    if (result.canceled) {
        return null;
    }
    return result.filePath;
});

// Open folder dialog
ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Output Folder',
        properties: ['openDirectory', 'createDirectory']
    });

    if (result.canceled) {
        return null;
    }
    return result.filePaths[0];
});

// Get app version
ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
});

// Show item in folder
ipcMain.handle('shell:showItemInFolder', (event, filePath) => {
    shell.showItemInFolder(filePath);
});

// Open external URL
ipcMain.handle('shell:openExternal', (event, url) => {
    shell.openExternal(url);
});

// Handle install update request from renderer
ipcMain.handle('update:install', () => {
    if (autoUpdater) {
        autoUpdater.quitAndInstall();
    }
});

console.log('Main process setup complete');
