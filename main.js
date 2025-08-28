import { app, BrowserWindow, ipcMain, protocol, Notification } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupIpcHandlers } from './electronIpcHandlers.js';
import { searchHybrid } from './electonAiService.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Set App User Model ID for Windows notifications
if (process.platform === 'win32') {
    app.setAppUserModelId("com.ai.taskflowai");
}


// ----------------------- Create BrowserWindow -----------------------
const createWindow = () => {
    const win = new BrowserWindow({
        fullscreen: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false
        }
    });
    // win.loadURL('http://localhost:5173'); // Vite dev
    // win.webContents.openDevTools();
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
};

// ----------------------- Safe-file protocol -----------------------
protocol.registerSchemesAsPrivileged([{
    scheme: 'safe-file',
    privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true, stream: true }
}]);

app.whenReady().then(() => {
    protocol.registerFileProtocol('safe-file', (request, callback) => {
        const url = request.url.replace('safe-file://', '');
        callback(decodeURIComponent(url));
    });

    createWindow();
    setupIpcHandlers(Notification);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});