import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'TaskFlowAI';
const DB_VERSION = 6; // Incremented version to trigger upgrade
const COLLECTIONS = [
  'List', 'Task', 'Note', 'SavedFilter', 'StickyNote', 
  'ChatSession', 'Goal', 'CustomFieldDefinition', 'UserStats',
  'Habit', 'HabitLog', 'CustomReminder'
];
const SETTINGS_STORE = 'settings';

let dbPromise: Promise<IDBPDatabase> | null = null;

const initDB = () => {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);
      COLLECTIONS.forEach(collection => {
        if (!db.objectStoreNames.contains(collection)) {
          const keyPath = 'id';
          const autoIncrement = collection !== 'UserStats'; // UserStats has fixed id: 1
          db.createObjectStore(collection, { keyPath, autoIncrement });
        }
      });
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
      }
    },
    blocking() {
      // This event is called on an open connection when a newer version of the database is trying to open.
      // idb's default action is to close this connection, which will trigger the 'terminated' event.
      console.warn('Database connection is blocked by a newer version. It will be closed.');
    },
    terminated() {
      // This event is called when the database connection is closed for any reason.
      // We reset the promise so the next operation will re-initialize the connection.
      console.warn('Database connection terminated. Resetting promise for re-initialization.');
      dbPromise = null;
    }
  });

  // If the initial open fails, reset the promise so we can try again.
  dbPromise.catch(err => {
      console.error('Failed to open database:', err);
      dbPromise = null;
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
    // For userStats, it's an upsert on a fixed ID, not auto-increment
    if (collection === 'UserStats') {
        const tx = db.transaction(collection, 'readwrite');
        await tx.store.put(data);
        await tx.done;
        return data;
    }
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