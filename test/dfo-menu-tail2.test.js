import test from 'node:test';
import assert from 'node:assert/strict';
import { setLocale, t } from '../src/locale/locale.js';

// Хвост меню 10.10, ваниль dfjs@4095f9b24 (dfjs-clean — эталон, т.к. dfjs
// грязный пробой). Вне скоупа и НЕ ключи: половинки шаблонов (Undo bringing
// in, Exit-объяснитель), код-константы (True, Modules., a development build),
// proper (Patreon, Oghma Infinium), титулы патронов (триаж: серверные данные),
// Esc-kneeling (Фаза 3), динамика сейвов/частей света (рантайм-данные).
const NEED = [
  'shots.kept_saved_full',
  'shots.gallery_full',
  'shots.kept_saved',
  'shots.kept_failed',
  'shots.kept_in_gallery',
  'loading.title',
  'loading.stage_data',
  'loading.stage_index',
  'loading.stage_towns',
  'loading.stage_land',
  'loading.tip_gallery',
  'loading.tip_bank',
  'loading.tip_spellmaker',
  'loading.tip_ask',
  'menu.map_text_and_icons',
  'menu.map_text_and_icons_note',
  'menu.standing_all',
  'menu.standing_all_note',
  'menu.stick_bottom_left',
  'account.recovery_code_title',
  'charsheet.risen_title',
  'charsheet.risen_text',
  'settings.unavailable_port',
  'settings.blocked_here',
];

const EN = {
  'shots.kept_saved_full': 'Screenshot saved. The gallery is full - delete some under Screenshots.',
  'shots.gallery_full': 'The gallery is full - delete some under Screenshots.',
  'shots.kept_saved': 'Screenshot saved.',
  'shots.kept_failed': 'The screenshot could not be kept.',
  'shots.kept_in_gallery': 'Screenshot kept - see Screenshots in the menu.',
  'loading.title': 'Loading',
  'loading.stage_data': 'Reading the game data',
  'loading.stage_index': 'Charting the Iliac Bay',
  'loading.stage_towns': 'Reading the towns',
  'loading.stage_land': 'Raising the land',
  'loading.tip_gallery':
    'Up to {max} of the screenshots you take are kept under Screenshots in the menu, and can stand on this screen while the world loads.',
  'loading.tip_bank':
    'Banks keep your gold, write letters of credit for the road and lend to those in good standing.',
  'loading.tip_spellmaker': 'Members of the Mages Guild can make spells of their own at the guild’s spellmaker.',
  'loading.tip_ask': 'Ask anyone in town where a place is, and they may mark it on your map.',
  'menu.map_text_and_icons': 'Map text and icons',
  'menu.map_text_and_icons_note': 'The world, town and dungeon maps. Auto grows them on screens taller than 1080p.',
  'menu.standing_all': 'Every faction\'s standing',
  'menu.standing_all_note':
    'Your reputation with every guild, temple, knightly order, kingdom, coven, vampire clan and Daedric Prince on the character sheet\'s Standing page - not only the ones you belong to.',
  'menu.stick_bottom_left': 'Bottom-left.',
  'account.recovery_code_title': 'Your recovery code',
  'charsheet.risen_title': 'You have risen',
  'charsheet.risen_text': 'You have risen.',
  'settings.unavailable_port': 'not available in this port',
  'settings.blocked_here': 'not here',
};

const RU = {
  'shots.kept_saved_full': 'Снимок сохранён. Галерея полна — удалите часть в разделе «Скриншоты».',
  'shots.gallery_full': 'Галерея полна — удалите часть в разделе «Скриншоты».',
  'shots.kept_saved': 'Снимок сохранён.',
  'shots.kept_failed': 'Снимок не удалось сохранить.',
  'shots.kept_in_gallery': 'Снимок добавлен в галерею — смотрите раздел «Скриншоты» в меню.',
  'loading.title': 'Загрузка',
  'loading.stage_data': 'Чтение игровых данных',
  'loading.stage_index': 'Картографирование Илиакского залива',
  'loading.stage_towns': 'Чтение городов',
  'loading.stage_land': 'Построение земли',
  'loading.tip_gallery':
    'До {max} сделанных вами снимков хранятся в разделе «Скриншоты» в меню и могут показываться на этом экране, пока грузится мир.',
  'loading.tip_bank':
    'Банки хранят ваше золото, выписывают аккредитивы для дороги и дают взаймы тем, у кого хорошая репутация.',
  'loading.tip_spellmaker': 'Члены Гильдии магов могут создавать собственные заклинания у создателя заклинаний гильдии.',
  'loading.tip_ask': 'Спросите любого в городе, где находится место, и вам могут отметить его на карте.',
  'menu.map_text_and_icons': 'Текст и значки карты',
  'menu.map_text_and_icons_note': 'Карты мира, городов и подземелий. Режим «Авто» увеличивает их на экранах выше 1080p.',
  'menu.standing_all': 'Репутация всех фракций',
  'menu.standing_all_note':
    'Ваша репутация в каждой гильдии, храме, рыцарском ордене, королевстве, ковене, клане вампиров и у каждого принца Даэдра — на странице «Репутация» листа персонажа, а не только там, где вы состоите.',
  'menu.stick_bottom_left': 'Внизу слева.',
  'account.recovery_code_title': 'Ваш код восстановления',
  'charsheet.risen_title': 'Вы получили уровень',
  'charsheet.risen_text': 'Вы получили уровень.',
  'settings.unavailable_port': 'нет в этом порте',
  'settings.blocked_here': 'нет здесь',
};

test('menu-tail2: all NEED keys exist with exact EN+RU', () => {
  for (const k of NEED) {
    setLocale('en');
    assert.equal(t(`dfo:${k}`), EN[k], `en:${k}`);
    setLocale('ru');
    assert.equal(t(`dfo:${k}`), RU[k], `ru:${k}`);
  }
  setLocale('en');
});

test('menu-tail2: gallery tip interpolates {max}', () => {
  setLocale('ru');
  assert.equal(
    t('dfo:loading.tip_gallery', { max: 12 }).startsWith('До 12 сделанных вами снимков'),
    true,
  );
  setLocale('en');
});
