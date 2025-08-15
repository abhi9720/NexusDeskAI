
export const desktopStorage = {
  async getAll(collection: string) {
    return await (window as any).desktopStorage.getAll(collection);
  },

  async getById(collection: string, id: string) {
    return await (window as any).desktopStorage.getById(collection, id);
  },

  async add(collection: string, data: any) {
    return await (window as any).desktopStorage.add(collection, data);
  },

  async update(collection: string, id: string, data: any) {
    return await (window as any).desktopStorage.update(collection, id, data);
  },

  async delete(collection: string, id: string) {
    return await (window as any).desktopStorage.delete(collection, id);
  },
  
  async getSetting(key: string) {
    return await (window as any).desktopStorage.getById("settings", key);
  },
  
  async setSetting(key: string, value: any) {
    return await (window as any).desktopStorage.update("settings", key, { value });
  }
};
