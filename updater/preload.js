// Мост окна — как у разработчиков (их launcherPreload.cjs, MIT): страница
// только слышит view и говорит, что нажато. Ссылки именованные, не URL.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('daggerLauncher', {
  onView: (cb) => {
    ipcRenderer.on('launcher:view', (_e, view) => cb(view));
    ipcRenderer.send('launcher:ready');
  },
  act: (action, arg) => ipcRenderer.send('launcher:act', { action: String(action), arg: arg ?? null }),
});
