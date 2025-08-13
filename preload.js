const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronStore', {
    set: (key, value) => ipcRenderer.invoke('store-set', key, value),
    get: (key) => ipcRenderer.invoke('store-get', key),
    saveAttachment: (file) => ipcRenderer.invoke('save-attachment', file)
});