import Database from 'better-sqlite3';
import { pipeline } from '@xenova/transformers';
import path from 'path';
import os from 'os';
import { app } from 'electron';
import * as sqliteVec from 'sqlite-vec';
import { fileURLToPath } from 'url';
// ------------------ Database ------------------
const dbPath = path.join(app.getPath('userData'), 'taskflow_ai2.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
// Enable loading extensions

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let extensionPath;
if (!app.isPackaged) {
    // dev → from node_modules
    switch (os.platform()) {
        case "darwin":
            extensionPath = path.resolve(__dirname, "node_modules/sqlite-vec-darwin-arm64/vec0.dylib");
            break;
        case "win32":
            extensionPath = path.resolve(__dirname, "node_modules/sqlite-vec-win32-x64/vec0.dll");
            break;
        case "linux":
            extensionPath = path.resolve(__dirname, "node_modules/sqlite-vec-linux-x64/vec0.so");
            break;
        default:
            throw new Error("Unsupported platform");
    }
} else {
    // prod → from extraResources
    switch (os.platform()) {
        case "darwin":
            extensionPath = path.resolve(process.resourcesPath, "extensions/sqlite-vec-darwin-arm64/vec0.dylib");
            break;
        case "win32":
            extensionPath = path.resolve(process.resourcesPath, "extensions/sqlite-vec-win32-x64/vec0.dll");
            break;
        case "linux":
            extensionPath = path.resolve(process.resourcesPath, "extensions/sqlite-vec-linux-x64/vec0.so");
            break;
        default:
            throw new Error("Unsupported platform");
    }
}

db.loadExtension(extensionPath);

try {
    const { vec_version } = db.prepare("SELECT vec_version() AS vec_version;").get();
    console.log("Vec loaded, version:", vec_version);
} catch (err) {
    console.error("Vec load failed:", err);
}

try {
    db.prepare("SELECT vec_distance_cosine(zeroblob(4), zeroblob(4))").run();
    console.log('vec_cosine_distance is available!');
} catch (checkError) {
    console.error('vec_cosine_distance is NOT available after loading:', checkError);
    // This is the error you are getting, but this check explicitly confirms it immediately after loading.
}

export { db };


// const tables = [
//     "List", "CustomFieldDefinition", "Task", "Note", "SavedFilter", "StickyNote", "ChatSession", "Goal", "UserStats", "settings", "Habit", "HabitLog"
// ];

// tables.forEach(table => {
//     try {
//         db.prepare(`DROP TABLE IF EXISTS ${table}`).run();
//         console.log(`Dropped table: ${table}`);
//     } catch (err) {
//         console.error(`Error dropping table ${table}:`, err);
//     }
// });



// ----------------------- Table creation -----------------------
db.exec(`
CREATE TABLE IF NOT EXISTS List (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('task', 'note')),
    parentId INTEGER,
    defaultView TEXT CHECK(defaultView IN ('list', 'board', 'calendar')),
    statuses TEXT,
    FOREIGN KEY (parentId) REFERENCES List(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS CustomFieldDefinition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    listId INTEGER,
    options TEXT,
    FOREIGN KEY (listId) REFERENCES List(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Task (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listId INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    priority TEXT NOT NULL,
    dueDate DATETIME,
    reminder DATETIME,
    createdAt DATETIME NOT NULL,
    tags TEXT,
    attachments TEXT,
    checklist TEXT,
    comments TEXT,
    embedding VECTOR(384),
    activityLog TEXT,
    customFields TEXT,
    linkedNoteIds TEXT,
    FOREIGN KEY (listId) REFERENCES List(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Note (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listId INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME,
    tags TEXT,
    attachments TEXT,
    embedding VECTOR(384),
    FOREIGN KEY (listId) REFERENCES List(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS SavedFilter (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    filter TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS StickyNote (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    color TEXT,
    position TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ChatSession (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    createdAt DATETIME NOT NULL,
    messages TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Goal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    motivation TEXT,
    targetDate DATETIME,
    createdAt DATETIME,
    completedAt DATETIME,
    status TEXT,
    progress INTEGER,
    linkedTaskListIds TEXT,
    journal TEXT
);

CREATE TABLE IF NOT EXISTS UserStats (
    id INTEGER PRIMARY KEY,
    points INTEGER NOT NULL,
    currentStreak INTEGER NOT NULL,
    lastCompletionDate TEXT
);

CREATE TABLE IF NOT EXISTS Habit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    frequency TEXT NOT NULL,
    targetDays TEXT,
    reminderTime TEXT,
    createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS HabitLog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habitId INTEGER NOT NULL,
    date TEXT NOT NULL,
    FOREIGN KEY (habitId) REFERENCES Habit(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS CustomReminder (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    remindAt TEXT NOT NULL,
    isCompleted BOOLEAN NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL
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

// Insert default user stats
const existingStats = db.prepare(`SELECT 1 FROM UserStats WHERE id = 1`).get();
if (!existingStats) {
    db.prepare(`INSERT INTO UserStats (id, points, currentStreak, lastCompletionDate) VALUES (?, ?, ?, ?)`).run(1, 0, 0, null);
}


// ------------------ Embedding ------------------
export let embedder  = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

// export async function initEmbedder() {
//     if (!embedder) {
//         ;
//     }
// }

export async function generateEmbedding(text) {
    if (!embedder) await initEmbedder();
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
}

export function embeddingToBuffer(embedding) {
    const floatArray = new Float32Array(embedding);
    return Buffer.from(floatArray.buffer);
}

export async function updateEmbeddingForRecord(table, id, data) {
    let textToEmbed = '';
    if (table === 'Task') {
        textToEmbed = `${data.title || ''} ${data.description || ''}`.trim();
    } else if (table === 'Note') {
        textToEmbed = `${data.title || ''} ${data.content || ''}`.trim();
    } else return;

    if (!textToEmbed) return;
    const embedding = await generateEmbedding(textToEmbed);
    if (!embedding) return;
    const buffer = embeddingToBuffer(embedding);
    const stmt = db.prepare(`UPDATE ${table} SET embedding = ? WHERE id = ?`);
    stmt.run(buffer, id);
}

// ------------------ Data helpers ------------------
export function parseRow(row) {
    if (!row) return null;
    const parsedRow = { ...row };
    for (const key in parsedRow) {
        if (key === 'embedding') continue;
        try {
            parsedRow[key] = JSON.parse(parsedRow[key]);
        } catch {
            if (parsedRow[key] === "true") parsedRow[key] = true;
            else if (parsedRow[key] === "false") parsedRow[key] = false;
        }
    }
    return parsedRow;
}

export function stringifyData(data) {
    const stringified = {};
    for (const key in data) {
        let val = data[key];
        if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
        else if (typeof val === 'boolean') val = val.toString();
        stringified[key] = val;
    }
    return stringified;
}