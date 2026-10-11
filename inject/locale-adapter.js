// Адаптер встройки пака в клиент daggerfall-js-source.
// Два исхода ответа разработчиков покрываются одним файлом:
//  - PR в апстрим: этот модуль ложится в src/locale/ как есть;
//  - внешний оверлей: грузится первым скриптом и подменяет те же точки.
// Правила врезки (подробно — inject/README.md):
//  - литерал 'You see %s.' → wrapLiteral('strings:youSee', { s: name });
//  - шаблон `${name} just died.` → wrapTemplate('strings:thingJustDied', { s: name }).
// Нюанс кавычек: значения DFU-мастеров иногда в кавычках ("'%s just died.'"),
// а клиент рисует без них — call site решает strip'ом, адаптер текст не правит.
export { t, setLocale, getLocale, splitKey } from '../src/locale/locale.js';
import { t } from '../src/locale/locale.js';

export function wrapLiteral(key, params = {}) {
  return t(key, params);
}

export function wrapTemplate(key, params = {}) {
  return t(key, params);
}
