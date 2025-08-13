import { app, BrowserWindow, ipcMain, protocol } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Store from 'electron-store';

const store = new Store();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

ipcMain.handle('save-attachment', async (event, { name, buffer }) => {
    const attachmentsPath = path.join(app.getPath('userData'), 'attachments');
    if (!fs.existsSync(attachmentsPath)) {
        fs.mkdirSync(attachmentsPath, { recursive: true });
    }
    const filePath = path.join(attachmentsPath, name);
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return filePath;
});

ipcMain.handle('store-set', (event, key, value) => {
    store.set(key, value);
});

ipcMain.handle('store-get', (event, key) => {
    return store.get(key);
});

const createWindow = () => {
    const win = new BrowserWindow({
        fullscreen: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false 

        }
    });
    win.loadURL(`file://${path.join(__dirname, 'dist', 'index.html')}`);
    // win.loadURL('http://localhost:5173');
    // win.webContents.openDevTools();
};

// Must be before app.whenReady()
protocol.registerSchemesAsPrivileged([
    {
        scheme: 'safe-file',
        privileges: {
            secure: true,
            standard: true,
            supportFetchAPI: true,
            corsEnabled: true,
            stream: true
        }
    }
]);

app.whenReady().then(() => {
    protocol.registerFileProtocol('safe-file', (request, callback) => {
        const url = request.url.replace('safe-file://', '');
        const decodedPath = decodeURIComponent(url);
        callback(decodedPath);
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});