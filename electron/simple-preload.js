const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  getCustomers: () => ipcRenderer.invoke('get-customers'),
  getRepairs: () => ipcRenderer.invoke('get-repairs'),
  getStats: () => ipcRenderer.invoke('get-stats'),
  addRepair: (repair) => ipcRenderer.invoke('add-repair', repair),
  isDesktopApp: true
});