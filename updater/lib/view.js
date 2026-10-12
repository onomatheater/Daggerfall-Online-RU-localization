// Состояние окна апдейтера в форме движка разработчиков (их launcher.js
// рисует view как есть; этот модуль — единственное место наших решений).
// Играть всегда disabled: запуск игры — не scope апдейтера перевода.
import { describeIssue } from './flow.js';

export function viewOf({ game, installed = [], check = null, gameUpdate = null, busy = false, prefs = {}, gameDir = '' } = {}) {
  const actions = [{ id: 'check', label: 'Проверить обновления' }];
  let status = 'Готов.';
  let detail = '';
  let note = '';
  let items = [];
  if (game?.version === null || game?.version === undefined) {
    note = describeIssue(game?.reason ?? 'unknown');
  }
  if (check?.status === 'available' && check.entry) {
    actions.push({ id: 'install', label: `Установить ${check.entry.version}`, primary: true });
    status = `Доступен пак ${check.entry.version}.`;
    const notes = Array.isArray(check.entry.notes) ? check.entry.notes : [];
    if (notes.length > 0) items = [{ version: check.entry.version, text: notes.join('\n') }];
  } else if (check?.status === 'up-to-date') {
    status = 'У тебя последний перевод.';
  } else if (check?.status === 'no-compatible') {
    status = 'Под твою версию игры пака пока нет.';
    note = note || 'Жди следующий выпуск — игра при этом работает.';
  } else if (check?.status === 'net-error' || check?.status === 'unknown-game') {
    status = describeIssue(check.reason ?? check.status);
  } else if (check?.status !== undefined && check?.status !== null) {
    status = describeIssue(check.reason ?? check.status);
  }
  if (installed.length >= 2) actions.push({ id: 'rollback', label: 'Откатить' });
  // Обновление игры — отдельным баннером (их notice-транспорт): только текст
  // и кнопка на страницу релизов, игру не трогаем. Состояние пака — в detail.
  if (gameUpdate?.status === 'available' && gameUpdate.tag) {
    if (status !== 'Готов.') detail = status;
    status = `Вышла версия игры ${String(gameUpdate.tag).replace(/^app-v/, '')}.`;
    actions.push({ id: 'download-game', label: 'Скачать игру', primary: !actions.some((a) => a.primary) });
  } else if (gameUpdate?.status === 'failed') {
    detail = 'Не получилось проверить обновления игры.';
  }
  return {
    busy,
    panel: 'news',
    version: game?.version ? `v${game.version}` : '',
    status,
    detail,
    progress: null,
    statusActions: actions,
    play: { enabled: false, label: 'Играть' },
    news: { items, note },
    options: {
      files: gameDir
        ? { path: gameDir, label: 'Сменить папку' }
        : { note: 'Папка игры не указана.', label: 'Указать папку' },
      checkOnLaunch: prefs.autoCheck === true,
    },
  };
}
