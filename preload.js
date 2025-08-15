const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopStorage', {
    getAll: (table) => ipcRenderer.invoke('db:getAll', table),
    getById: (table, id) => ipcRenderer.invoke('db:getById', table, id),
    add: (table, data) => ipcRenderer.invoke('db:add', table, data),
    update: (table, id, data) => ipcRenderer.invoke('db:update', table, id, data),
    delete: (table, id) => ipcRenderer.invoke('db:delete', table, id),
    saveAttachment: (file) => ipcRenderer.invoke('save-attachment', file)
});