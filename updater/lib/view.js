// Состояние окна апдейтера в форме движка разработчиков (их launcher.js
// рисует view как есть; этот модуль — единственное место наших решений).
// Играть всегда disabled: запуск игры — не scope апдейтера перевода.
import { describeIssue } from './flow.js';

export function viewOf({ game, installed = [], check = null, gameNews = [], gameUpdate = null, busy = false, progress = null, prefs = {}, gameDir = '' } = {}) {
  const actions = [{ id: 'check', label: 'Проверить' }];
  let status = 'Готов.';
  let detail = '';
  let note = '';
  // Новости видны всегда: свежие игровые, затем свежий пак, затем стоящий пак.
  const items = [...(Array.isArray(gameNews) ? gameNews : [])];
  let packNoted = false;
  const pushNotes = (version, notes) => {
    const lines = Array.isArray(notes) ? notes : [];
    if (lines.length > 0) {
      items.push({ version, text: lines.join('\n') });
      packNoted = true;
    }
  };
  if (game?.version === null || game?.version === undefined) {
    note = describeIssue(game?.reason ?? 'unknown');
  }
  if (check?.status === 'available' && check.entry) {
    actions.push({ id: 'install', label: 'Установить', primary: true });
    status = `Доступен пак ${check.entry.version}.`;
    pushNotes(check.entry.version, check.entry.notes);
  } else if (check?.status === 'up-to-date') {
    status = 'Установлена последняя версия перевода.';
  } else if (check?.status === 'no-compatible') {
    status = 'Под твою версию игры пака пока нет.';
    note = note || 'Жди следующий выпуск — игра при этом работает.';
  } else if (check?.status === 'net-error' || check?.status === 'unknown-game') {
    status = describeIssue(check.reason ?? check.status);
  } else if (check?.status !== undefined && check?.status !== null) {
    status = describeIssue(check.reason ?? check.status);
  }
  if (installed.length >= 2) actions.push({ id: 'rollback', label: 'Откатить' });
  if (!packNoted && installed[0]) pushNotes(installed[0].version, installed[0].notes);
  // Обновление игры — отдельным баннером (их notice-транспорт): только текст
  // и кнопка на страницу релизов, игру не трогаем. Состояние пака — в detail.
  if (gameUpdate?.status === 'available' && gameUpdate.tag) {
    if (status !== 'Готов.') detail = status;
    status = `Вышла версия игры ${String(gameUpdate.tag).replace(/^app-v/, '')}.`;
    actions.push({ id: 'download-game', label: 'Обновить игру', primary: !actions.some((a) => a.primary) });
  } else if (gameUpdate?.status === 'failed') {
    detail = 'Не получилось проверить обновления игры.';
  }
  return {
    busy,
    panel: 'news',
    version: game?.version ? `v${game.version}` : '',
    status,
    detail,
    progress,
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
