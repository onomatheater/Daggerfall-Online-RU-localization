// Рендер окна (по приёмам лаунчера разработчиков: мост без состояния,
// тексты только через textContent и только при изменении, ссылки —
// делегированием через шелл). Своей сети нет, выбора нет (решает main).
const $ = (id) => document.getElementById(id);
const setText = (node, text) => { if (node.textContent !== text) node.textContent = text; };
const say = (text) => setText($('status'), text);
let pending = null;

function showBanner(entry, gameVersion) {
  $('banner').hidden = false;
  setText($('banner-title'), `Вышла версия ${entry.version}`);
  setText($('banner-detail'), `У вас ${gameVersion ?? 'неизвестно'} — пак встанет рядом с игрой, сохранения на месте.`);
}

function hideBanner() {
  $('banner').hidden = true;
  pending = null;
}

async function refresh() {
  try {
    const game = await window.ruUpdater.game();
    setText($('game'), game.version === null
      ? `Игра: не найдена (${await window.ruUpdater.describe(game.reason)})`
      : `Игра: ${game.version}`);
    setText($('version'), game.version === null ? '' : `v${game.version}`);
    const installed = await window.ruUpdater.installed();
    setText($('installed'), installed.length > 0
      ? `Установлен: ${installed[0].version}`
      : 'Установлен: нет');
    $('rollback').disabled = installed.length < 2;
    const prefs = await window.ruUpdater.prefs();
    $('auto-check').checked = prefs.autoCheck === true;
  } catch (err) {
    say(await window.ruUpdater.describe(err.message));
  }
}

async function runCheck(silent) {
  const rep = await window.ruUpdater.check();
  if (rep.status === 'available') {
    pending = rep.entry;
    const game = await window.ruUpdater.game();
    showBanner(rep.entry, game.version);
    say('');
    return true;
  }
  if (!silent) {
    if (rep.status === 'up-to-date') say('У тебя последний перевод.');
    else if (rep.status === 'no-compatible') say('Под твою версию игры пака пока нет — жди следующий выпуск.');
    else say(await window.ruUpdater.describe(rep.reason ?? 'unknown'));
  }
  return false;
}

async function doInstall(entry) {
  say(`Ставлю ${entry.version}…`);
  try {
    const rep = await window.ruUpdater.install(entry);
    if (rep.ok) {
      hideBanner();
      say(`Готово: пак ${rep.version}.`);
    } else {
      say(`Отказ: ${await window.ruUpdater.describe(rep.reason ?? (rep.errors ?? []).join('; '))}`);
    }
  } catch (err) {
    say(await window.ruUpdater.describe(err.message));
  }
  refresh();
}

document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-open]');
  if (link) window.ruUpdater.open(link.dataset.open);
});

$('check').onclick = async () => {
  say('Проверяю…');
  try {
    await runCheck(false);
  } catch (err) {
    say(await window.ruUpdater.describe(err.message));
  }
};

$('banner-install').onclick = async () => {
  if (pending) await doInstall(pending);
};

$('rollback').onclick = async () => {
  say('Откатываю…');
  try {
    const rep = await window.ruUpdater.rollback();
    say(rep.ok ? `Готово: вернулся пак ${rep.version}.` : 'Нечего откатывать.');
  } catch (err) {
    say(await window.ruUpdater.describe(err.message));
  }
  refresh();
};

$('auto-check').onchange = async (e) => {
  await window.ruUpdater.setPrefs({ autoCheck: e.target.checked });
};

(async () => {
  await refresh();
  try {
    const startup = await window.ruUpdater.startup();
    if (startup.action === 'check') await runCheck(true);
  } catch { /* авточек молчит по закону DA6 */ }
})();
