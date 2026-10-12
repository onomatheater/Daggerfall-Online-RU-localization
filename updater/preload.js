// Мост в изоляцию: рендер видит только 5 вызовов, ни electron, ни fs, ни сеть.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ruUpdater', {
  game: () => ipcRenderer.invoke('game'),
  installed: () => ipcRenderer.invoke('installed'),
  check: () => ipcRenderer.invoke('check'),
  install: (entry) => ipcRenderer.invoke('install', entry),
  rollback: () => ipcRenderer.invoke('rollback'),
});
