import { app, BrowserWindow, ipcMain, protocol } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(app.getPath('userData'), 'taskflow_ai.db');
console.log(">>> ", dbPath);

const db = new Database(dbPath);

// Enable foreign key enforcement
db.pragma('foreign_keys = ON');

// ----------------------- Helper functions -----------------------
function parseRow(row) {
    if (!row) return null;
    const parsedRow = { ...row };
    for (const key in parsedRow) {
        try {
            parsedRow[key] = JSON.parse(parsedRow[key]);
        } catch {
            // Convert string "true"/"false" to boolean
            if (parsedRow[key] === "true") parsedRow[key] = true;
            else if (parsedRow[key] === "false") parsedRow[key] = false;
        }
    }
    return parsedRow;
}

function stringifyData(data) {
    const stringified = {};
    for (const key in data) {
        let val = data[key];
        if (typeof val === 'object' && val !== null) {
            val = JSON.stringify(val);
        } else if (typeof val === 'boolean') {
            val = val.toString(); // "true"/"false"
        }
        stringified[key] = val;
    }
    return stringified;
}

// ----------------------- Table creation -----------------------
db.exec(`
CREATE TABLE IF NOT EXISTS lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('task', 'note')),
    defaultView TEXT CHECK(defaultView IN ('list', 'board', 'calendar')),
    statuses TEXT
);

CREATE TABLE IF NOT EXISTS customFieldDefinitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    listId INTEGER,
    options TEXT,
    FOREIGN KEY (listId) REFERENCES lists(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listId INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    priority TEXT NOT NULL,
    dueDate DATETIME,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME,
    tags TEXT,
    attachments TEXT,
    checklist TEXT,
    comments TEXT,
    activityLog TEXT,
    customFields TEXT,
    FOREIGN KEY (listId) REFERENCES lists(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listId INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME,
    tags TEXT,
    attachments TEXT,
    FOREIGN KEY (listId) REFERENCES lists(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS savedFilters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    filter TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stickyNotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    color TEXT,
    position TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chatSessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    createdAt DATETIME NOT NULL,
    messages TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    vision TEXT,
    targetDate DATETIME,
    linkedProjectId INTEGER,
    imageUrl TEXT,
    FOREIGN KEY (linkedProjectId) REFERENCES lists(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    linkedGoalId INTEGER,
    frequency TEXT NOT NULL,
    FOREIGN KEY (linkedGoalId) REFERENCES goals(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS habitLogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habitId INTEGER NOT NULL,
    date DATE NOT NULL,
    completed TEXT NOT NULL,
    FOREIGN KEY (habitId) REFERENCES habits(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    value TEXT
);
`);

// Insert default settings
const defaultSettings = [
    { id: 'onboardingComplete', value: 'false' },
    { id: 'userName', value: '' },
    { id: 'apiKey', value: '' },
];
defaultSettings.forEach(setting => {
    const existing = db.prepare(`SELECT 1 FROM settings WHERE id = ?`).get(setting.id);
    if (!existing) {
        db.prepare(`INSERT INTO settings (id, value) VALUES (?, ?)`).run(setting.id, setting.value);
    }
});

console.log("Database initialized");

// ----------------------- IPC handlers -----------------------
ipcMain.handle('save-attachment', (event, { name, buffer }) => {
    const attachmentsPath = path.join(app.getPath('userData'), 'attachments');
    if (!fs.existsSync(attachmentsPath)) fs.mkdirSync(attachmentsPath, { recursive: true });
    const filePath = path.join(attachmentsPath, name);
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return filePath;
});

ipcMain.handle('db:getAll', (event, table) => {
    const stmt = db.prepare(`SELECT * FROM ${table}`);
    return stmt.all().map(parseRow);
});

ipcMain.handle('db:getById', (event, table, id) => {
    const stmt = db.prepare(`SELECT * FROM ${table} WHERE id = ?`);
    return parseRow(stmt.get(id));
});

ipcMain.handle('db:add', (event, table, data) => {
    const stringifiedData = stringifyData(data);
    const keys = Object.keys(stringifiedData);
    const placeholders = keys.map(() => '?').join(',');

    const stmt = db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`);
    const info = stmt.run(...keys.map(k => stringifiedData[k]));

    const newId = info.lastInsertRowid;
    const newRow = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(newId);

    return parseRow(newRow);
});

ipcMain.handle('db:update', (event, table, id, data) => {
    const stringifiedData = stringifyData(data);
    const keys = Object.keys(stringifiedData);
    const assignments = keys.map(key => `${key} = ?`).join(',');
    const stmt = db.prepare(`UPDATE ${table} SET ${assignments} WHERE id = ?`);
    return stmt.run(...keys.map(k => stringifiedData[k]), id).changes;
});

ipcMain.handle('db:delete', (event, table, id) => {
    const stmt = db.prepare(`DELETE FROM ${table} WHERE id = ?`);
    return stmt.run(id).changes;
});

// ----------------------- Create BrowserWindow -----------------------
const createWindow = () => {
    const win = new BrowserWindow({
        fullscreen: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false
        }
    });
    win.loadURL('http://localhost:5173'); // Vite dev
    win.webContents.openDevTools();
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
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});