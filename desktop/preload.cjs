const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('mavieDesktop', Object.freeze({
  isDesktop: true,
  openReceiptsFolder: () => ipcRenderer.invoke('mavie:receipts'),
  openDataFolder: () => ipcRenderer.invoke('mavie:data'),
  setTheme: (mode) => ipcRenderer.invoke('mavie:theme', mode),
}));
