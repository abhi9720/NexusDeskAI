import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'TaskFlowAI';
const DB_VERSION = 2; // Incremented version to trigger upgrade
const COLLECTIONS = [
  'lists', 'tasks', 'notes', 'savedFilters', 'stickyNotes', 
  'chatSessions', 'goals', 'habits', 'habitLogs', 'customFieldDefinitions'
];
const SETTINGS_STORE = 'settings';

let dbPromise: Promise<IDBPDatabase> | null = null;

const initDB = () => {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      COLLECTIONS.forEach(collection => {
        if (!db.objectStoreNames.contains(collection)) {
          db.createObjectStore(collection, { keyPath: 'id', autoIncrement: true });
        }
      });
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
      }
    },
  });
  return dbPromise;
};

export const webStorage = {
  async getAll(collection: string) {
    const db = await initDB();
    return await db.getAll(collection);
  },

  async getById(collection: string, id: number | string) {
    const db = await initDB();
    return await db.get(collection, id);
  },

  async add(collection: string, data: any) {
    const db = await initDB();
    const newId = await db.add(collection, data);
    return await db.get(collection, newId); // Return the full object with the new ID
  },

  async update(collection: string, id: number | string, data: any) {
    const db = await initDB();
    await db.put(collection, { ...data, id });
    return data;
  },

  async delete(collection: string, id: number | string) {
    const db = await initDB();
    await db.delete(collection, id);
  },
  
  async getSetting(key: string) {
      const db = await initDB();
      const result = await db.get(SETTINGS_STORE, key);
      return result ? result.value : null;
  },
  
  async setSetting(key: string, value: any) {
      const db = await initDB();
      await db.put(SETTINGS_STORE, { key, value });
  }
};