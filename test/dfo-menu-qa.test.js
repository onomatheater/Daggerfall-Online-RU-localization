import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { setLocale, t } from '../src/locale/locale.js';

// QA-батч «без контекста»: значения ниже сверены с call-site'ами ванили
// dfjs@4095f9b24 (см. леджер). Отклонённые подозрения (контекст оправдал
// старое): menu.pack=Рюкзак (инвентарь, не мод-пак), menu.hidden=Скрытые
// (плюральный заголовок), menu.sync_from_server (заголовок-существительное),
// menu.reclaim_quest=Вернуть квест (точно), menu.false=Нет (дисплей Да/Нет,
// ключ пока не выведен), menu.playing/menu.stored (не выведены/вне меню),
// fontscale.label=Размер шрифта (EN Size, не Scale), bindgrp.online=Сеть
// (краткий заголовок группы), testroom.darkelf_nightblade (male по testRoom.js).
const FIX = {
  'menu.controller_crossbar': 'Кроссбар геймпада',
  'settings.Audio/SoundFont': 'Набор инструментов музыки',
  'tip.Audio/SoundFont': 'Активный набор инструментов музыки',
  'settings.GUI/EnableVitalsIndicators': 'Полосы здоровья и усталости',
  'settings.Controls/ToggleSneak': 'Красться (переключатель)',
  'settings.Effects/MotionBlurSampleCount': 'Сэмплы размытия в движении',
  'bind.MoveLeft': 'Движение влево',
  'bind.MoveRight': 'Движение вправо',
  'bind.WalkMode': 'Режим ходьбы вкл/выкл',
  'menu.gyro_aim': 'Наведение гироскопом',
  'bind.TorchDrop': 'Бросить факел',
  'bindc.protect': 'Не задевать своих и нейтралов',
  'settings.Controls/WeaponAttackThreshold': 'Требуемый размах замаха',
  'settings.GUI/HelmAndShieldMaterialDisplay': 'Материал шлемов и щитов',
  'settings.GUI/EnableInventoryInfoPanel': 'Панель информации инвентаря',
  'menu.preset_custom': 'Пользовательский',
  'bindc.vanilla': 'Оригинал',
  'bindc.move_h': 'Движение по гориз.',
  'bindc.move_v': 'Движение по верт.',
  'bindc.cam_h': 'Камера по гориз.',
  'bindc.cam_v': 'Камера по верт.',
  'catblurb.audio': 'Музыка, звуковые эффекты и голоса в бою.',
  'instead.Video/VSync': 'Кадры всегда дожидаются обновления экрана. Чтобы идти медленнее, задайте ограничение частоты кадров.',
  'menu.daggerfall': 'Daggerfall',
  'menu.every_mod_and_enhancement_goes_to_off_or_to_dagg':
    'Каждый мод и улучшение выключается; где «Выкл» нет — остаётся вариант Daggerfall.',
  'menu.overhauls': 'Оформление',
  'menu.overhauls_blurb':
    'Целостный облик мира, его звуков и интерфейса — текстуры Vanilla Enhanced и остальное — выбирается на странице «Оформление».',
  'launcher.news.title': 'Заметки к патчу',
  'launcher.news.loading': 'Загрузка заметок к патчу',
  'launcher.news.none': 'Заметок к патчу пока нет.',
  'launcher.news.offline': 'Не удалось загрузить заметки к патчу — GitHub не ответил.',
  'launcher.detail.just_updated': 'Что изменилось — в заметках к патчу.',
  'launcher.status.uptodate': 'Последняя версия',
  'instead.Daggerfall/MyDaggerfallUnityScreenshotsPath':
    'Изображения сохраняются туда, куда ваш браузер кладёт загрузки.',
  'menu.import_a_saves_folder': 'Импортировать папку Saves',
  'menu.never_saved': 'Не сохранено',
  'menu.nothing_live_here_yet': 'Здесь пока пусто',
  'menu.press_buzz': 'Короткая вибрация при нажатиях, взмахах и срабатывании замков.',
  'menu.thumb_lands': 'Там, где коснулся палец.',
  'menu.enter_as': 'Войти как {label}',
  'menu.the_outdoors': 'Открытая местность',
  'menu.test_the_outdoors': 'Тест открытого мира',
  'menu.standing': 'Репутация',
  'menu.spawn': 'Появиться',
  'menu.record': 'Статистика',
  'menu.abandon_bounty': 'Бросить награду',
  'menu.online_needs_an_account_so_no_one_else_can_use_y':
    'Для сетевой игры нужна учётная запись, чтобы имя не заняли. Гостем — один клик и без почты.',
  'account.patreon_linked_title': 'Patreon привязан. Титул выбирается в разделе «Титул».',
  'menu.show_travellers': 'Вне помещений игроки вашей области видят вас на карте. ',
};

test('menu-qa: context-checked RU values', () => {
  setLocale('ru');
  for (const [k, v] of Object.entries(FIX)) assert.equal(t(`dfo:${k}`), v, k);
  setLocale('en');
});

test('menu-qa: EN side untouched (byte parity)', () => {
  const en = JSON.parse(fs.readFileSync(new URL('../src/locale/en.json', import.meta.url), 'utf8')).dfo;
  assert.equal(en['menu.standing'], 'Standing');
  assert.equal(en['menu.spawn'], 'Spawn');
  assert.equal(en['menu.record'], 'Record');
  assert.equal(en['menu.show_travellers'], 'Outdoors, players in your region see you on the overworld and the map. ');
  assert.equal(en['menu.enter_as'], 'Enter as the {label}');
  void fs;
});
