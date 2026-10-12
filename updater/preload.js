// Мост в изоляцию: рендер видит только перечисленные вызовы, ни electron, ни fs, ни сеть.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ruUpdater', {
  game: () => ipcRenderer.invoke('game'),
  describe: (reason) => ipcRenderer.invoke('describe', reason),
  open: (where) => ipcRenderer.invoke('open', where),
  prefs: () => ipcRenderer.invoke('prefs'),
  setPrefs: (prefs) => ipcRenderer.invoke('setPrefs', prefs),
  startup: () => ipcRenderer.invoke('startup'),
  installed: () => ipcRenderer.invoke('installed'),
  check: () => ipcRenderer.invoke('check'),
  install: (entry) => ipcRenderer.invoke('install', entry),
  rollback: () => ipcRenderer.invoke('rollback'),
});
