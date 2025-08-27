// electronIpcHandlers.js

import path from 'path';
import fs from 'fs';
import { db, parseRow, stringifyData, updateEmbeddingForRecord } from './electronDBHelpers.js';
import { ipcMain, app } from 'electron';
import { searchHybrid } from './electonAiService.js';


export function setupIpcHandlers(Notification) {

    // ----------------------- Attachments -----------------------
    ipcMain.handle('save-attachment', (event, { name, buffer }) => {
        const attachmentsPath = path.join(app.getPath('userData'), 'attachments');
        if (!fs.existsSync(attachmentsPath)) fs.mkdirSync(attachmentsPath, { recursive: true });
        const filePath = path.join(attachmentsPath, name);
        fs.writeFileSync(filePath, Buffer.from(buffer));
        return filePath;
    });

    // ----------------------- CRUD -----------------------
    ipcMain.handle('db:getAll', (event, table) => {
        console.log(`[db:getAll] Called with table:`, table);
        const stmt = db.prepare(`SELECT * FROM ${table}`);
        const result = stmt.all().map(parseRow);
        console.log(`[db:getAll] Returning result:`, result);
        return result;
    });

    ipcMain.handle('db:getById', (event, table, id) => {
        console.log(`[db:getById] Called with table:`, table, 'id:', id);
        const stmt = db.prepare(`SELECT * FROM ${table} WHERE id = ?`);
        const result = parseRow(stmt.get(id));
        console.log(`[db:getById] Returning result:`, result);
        return result;
    });

    ipcMain.handle('db:add', async (event, table, data) => {
        console.log(`[db:add] Called with table:`, table, 'data:', data);
        const stringifiedData = stringifyData(data);
        const keys = Object.keys(stringifiedData);
        const placeholders = keys.map(() => '?').join(',');
        const stmt = db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`);
        const info = stmt.run(...keys.map(k => stringifiedData[k]));

        const newId = info.lastInsertRowid;
        const newRow = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(newId);
        if (table === 'Task' || table === 'Note') {
            await updateEmbeddingForRecord(table, newId, newRow);
        }

        const result = parseRow(newRow);
        console.log(`[db:add] Returning result:`, result);
        return result;
    });

    ipcMain.handle('db:update', async (event, table, id, data) => {
        console.log(`[db:update] Called with table:`, table, 'id:', id, 'data:', data);
        const stringifiedData = stringifyData(data);
        const keys = Object.keys(stringifiedData);
        const assignments = keys.map(key => `${key} = ?`).join(',');
        const stmt = db.prepare(`UPDATE ${table} SET ${assignments} WHERE id = ?`);
        const info = stmt.run(...keys.map(k => stringifiedData[k]), id);

        if (table === 'Task' || table === 'Note') {
            await updateEmbeddingForRecord(table, id, data);
        }

        console.log(`[db:update] Returning changes:`, info.changes);
        return info.changes;
    });

    ipcMain.handle('db:delete', (event, table, id) => {
        console.log(`[db:delete] Called with table:`, table, 'id:', id);
        const stmt = db.prepare(`DELETE FROM ${table} WHERE id = ?`);
        const result = stmt.run(id).changes;
        console.log(`[db:delete] Returning changes:`, result);
        return result;
    });

    ipcMain.handle('db:updateEmbedding', async (event, table, id) => {
        console.log(`[db:updateEmbedding] Called with table:`, table, 'id:', id);
        const stmt = db.prepare(`SELECT * FROM ${table} WHERE id = ?`);
        const record = stmt.get(id);
        if (!record) throw new Error(`Record with id ${id} not found in table ${table}`);
        await updateEmbeddingForRecord(table, id, record);
        console.log(`[db:updateEmbedding] Returning: true`);
        return true;
    });

    // ----------------------- Hybrid Search -----------------------
    // ------------------ Hybrid Search ------------------
    ipcMain.handle('db:searchHybrid', async (event, userQuery) => {
        try {
            return await searchHybrid(userQuery);
        } catch (err) {
            console.error('Error in searchHybrid:', err);
            throw err;
        }
    });

    // ----------------------- Notifications -----------------------
    // ----------------------- Notifications -----------------------
    ipcMain.on('show-notification', (event, options) => {
        console.log('Received show-notification with options:', options);
        if (Notification && Notification.isSupported()) {
            try {
                const { title, body } = options;
                const notification = new Notification({ title, body, silent: false });

                notification.on('show', () => console.log(`Notification shown: ${title}`));
                notification.on('failed', (e, error) => console.error(`Notification failed for "${title}":`, error));
                notification.on('click', () => console.log(`Notification clicked: ${title}`));
                notification.on('close', () => console.log(`Notification closed: ${title}`));

                notification.show();
                console.log(`Called .show() for notification: "${title}"`);
            } catch (e) {
                console.error('Error creating or showing notification:', e);
            }
        } else {
            console.log('Notifications not supported on this system or Notification module not passed.');
        }
    });
}