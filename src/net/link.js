// Линк предмета в чат: по проводу едет только ID, имя рисует получатель
// на своей локали. Локализованная строка в проводе запрещена — toWire
// бросает, а не молча режет (тихая резка прячет баги интеграции).
// Интеграция в игру: чат шлёт { kind:'itemLink', templateId, ...extra },
// приёмник зовёт renderLink(wire, getLocale(), nameTable), где nameTable —
// { en: {id: name}, ru: {id: name} } из таблиц items. Старый клиент, не
// знающий kind, игнорит фрейм — десинка нет.
export function toWire({ templateId, ...rest } = {}) {
  if (!templateId || typeof templateId !== 'string') throw new Error('ID-only: templateId required');
  for (const k of Object.keys(rest)) {
    if (/text|name|title|caption/i.test(k)) throw new Error(`ID-only: localized field '${k}' must not go on the wire`);
  }
  return { kind: 'itemLink', templateId };
}

export function renderLink(wire, locale, names) {
  if (!wire || wire.kind !== 'itemLink' || typeof wire.templateId !== 'string') return '';
  return names?.[locale]?.[wire.templateId] ?? names?.en?.[wire.templateId] ?? wire.templateId;
}
