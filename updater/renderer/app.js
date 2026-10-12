// Рендер апдейтера: кнопки -> мост, состояние -> текст. Логики выбора нет
// (решает main через checkForUpdate), сети нет (качает main по кнопке).
const $ = (id) => document.getElementById(id);
const say = (text) => { $('status').textContent = text; };
let pending = null;

async function refresh() {
  try {
    const game = await window.ruUpdater.game();
    $('game').textContent = game.version === null
      ? `Игра: не найдена (${await window.ruUpdater.describe(game.reason)})`
      : `Игра: ${game.version}`;
    const installed = await window.ruUpdater.installed();
    $('installed').textContent = installed.length > 0
      ? `Установлен: ${installed[0].version}`
      : 'Установлен: нет';
    $('rollback').disabled = installed.length < 2;
  } catch (err) {
    say(`Ошибка: ${err.message}`);
  }
}

$('check').onclick = async () => {
  say('Проверяю…');
  $('install').disabled = true;
  try {
    const rep = await window.ruUpdater.check();
    if (rep.status === 'available') {
      pending = rep.entry;
      $('found').textContent = `Доступен пак ${rep.entry.version}.`;
      $('install').disabled = false;
      say('');
    } else if (rep.status === 'up-to-date') {
      $('found').textContent = '';
      say('У тебя последний перевод.');
    } else if (rep.status === 'no-compatible') {
      say('Под твою версию игры пака пока нет — жди следующий выпуск.');
    } else {
      say(await window.ruUpdater.describe(rep.reason ?? 'unknown'));
    }
  } catch (err) {
    say(`Не получилось: ${err.message}`);
  }
};

$('install').onclick = async () => {
  if (!pending) return;
  say(`Ставлю ${pending.version}…`);
  $('install').disabled = true;
  try {
    const rep = await window.ruUpdater.install(pending);
    say(rep.ok ? `Готово: пак ${rep.version}.` : `Отказ: ${rep.reason ?? (rep.errors ?? []).join('; ')}`);
  } catch (err) {
    say(`Не получилось: ${err.message}`);
  }
  pending = null;
  refresh();
};

$('rollback').onclick = async () => {
  say('Откатываю…');
  try {
    const rep = await window.ruUpdater.rollback();
    say(rep.ok ? `Готово: вернулся пак ${rep.version}.` : `Нечего откатывать.`);
  } catch (err) {
    say(`Не получилось: ${err.message}`);
  }
  refresh();
};

refresh();
