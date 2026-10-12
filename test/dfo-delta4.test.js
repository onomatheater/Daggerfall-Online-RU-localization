import test from 'node:test';
import assert from 'node:assert/strict';
import { t, setLocale } from '../src/locale/locale.js';
import en from '../src/locale/en.json' with { type: 'json' };
import ru from '../src/locale/ru.json' with { type: 'json' };

// NEED: дельта-4 — хинты биндов (%s), паки, тиры. EN — исходный регистр
// (капс на экране даёт CSS), RU — нормальный регистр.

test('delta4: EN byte-exact + RU', () => {
  const E = {
    'bindc.hud_note': 'Turn off (or press Alt+U) to move HUD pieces.',
    'bindc.swing_unbound': 'Unbound - nothing can swing your weapon.',
    'bindc.swing_press': 'Press %s to swing.',
    'bindc.swing_hold': 'Press or hold %s to swing.',
    'bindc.swing_move': 'Hold %s and move the mouse to swing - the way you move picks the blow. A press without moving does nothing.',
    'bindc.swing_ready': 'Draw your weapon first with %s (Ready Weapon).',
    'bindc.float_jump': 'Jump (%s) rises too while you swim or levitate.',
    'bindc.float_crouch': 'Crouch (%s) sinks too while you swim or levitate.',
    'bindc.share_jump': 'Jump already rises while you swim or levitate, so the key does both as it is.',
    'bindc.share_crouch': 'Crouch already sinks while you swim or levitate, so the key does both as it is.',
    'bindc.not_here': 'Not available here',
    'bindc.peer_near': 'Near',
    'ovh.attach_music': 'Attach music pack',
    'ovh.attach_sound': 'Attach sound pack',
    'ovh.attach_texture': 'Attach texture pack',
    'ovh.lighting_mod': 'Lighting mod',
    'ovh.attach_lighting': 'Attach lighting mod',
    'ovh.texture_mods': 'Texture mods (.dfmod)',
    'ovh.add_texture': 'Add texture mods',
    'ovh.switch_on': 'Switch on',
    'ovh.switch_off': 'Switch off',
    'ovh.peer_onoff': 'On: the sprite above. Off: the paperdoll.',
  };
  const R = {
    'bindc.hud_note': 'Выключи (или Alt+U), чтобы двигать куски интерфейса.',
    'bindc.swing_unbound': 'Не назначено — взмахнуть оружием нечем.',
    'bindc.swing_press': 'Нажми %s для взмаха.',
    'bindc.swing_hold': 'Нажми или держи %s для взмаха.',
    'bindc.swing_move': 'Держи %s и веди мышь для взмаха — направление ведения выбирает удар. Нажатие без движения ничего не даёт.',
    'bindc.swing_ready': 'Сначала достань оружие клавишей %s (Подготовка оружия).',
    'bindc.float_jump': 'Прыжок (%s) поднимает также во время плавания или левитации.',
    'bindc.float_crouch': 'Приседание (%s) опускает также во время плавания или левитации.',
    'bindc.share_jump': 'Прыжок уже поднимает во время плавания или левитации, так что клавиша и так делает оба действия.',
    'bindc.share_crouch': 'Приседание уже опускает во время плавания или левитации, так что клавиша и так делает оба действия.',
    'bindc.not_here': 'Здесь недоступно',
    'bindc.peer_near': 'Рядом',
    'ovh.attach_music': 'Подключить музыкальный пак',
    'ovh.attach_sound': 'Подключить звуковой пак',
    'ovh.attach_texture': 'Подключить текстурный пак',
    'ovh.lighting_mod': 'Мод освещения',
    'ovh.attach_lighting': 'Подключить мод освещения',
    'ovh.texture_mods': 'Текстурные моды (.dfmod)',
    'ovh.add_texture': 'Добавить текстурные моды',
    'ovh.switch_on': 'Включить',
    'ovh.switch_off': 'Выключить',
    'ovh.peer_onoff': 'Вкл: спрайт выше. Выкл: бумажная кукла.',
  };
  for (const [k, v] of Object.entries(E)) assert.equal(en.dfo[k], v, 'EN ' + k);
  for (const [k, v] of Object.entries(R)) assert.equal(ru.dfo[k], v, 'RU ' + k);
  setLocale('ru');
  assert.equal(t('dfo:bindc.peer_near'), 'Рядом');
  assert.equal(t('dfo:ovh.switch_on'), 'Включить');
  setLocale('en');
});
