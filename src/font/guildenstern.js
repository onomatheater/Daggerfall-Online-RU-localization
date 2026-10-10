// Guildenstern NBP — читаемый кириллический пиксель-шрифт (Nate Halley,
// CC BY-SA 3.0). Вендорится ЯВНЫМ решением человека 10.10 как исключение из
// OFL-only (см. vendor/guildenstern-nbp/ATTRIBUTION.md): единственный
// проверенный читаемый вариант, в апстрим MIT без отдельного разбора — нет.
// Один вес (NBP — синглвейт, заявлен как 400); минимум 14px держать в пробе.
export const GUILDENSTERN_FILES = [
  'GuildensternNbp.ttf',
  'RosencrantzNbp.ttf',
  'COPYRIGHT.txt',
  'readme.txt',
  'ATTRIBUTION.md',
];

export const GUILDENSTERN_FACE =
  `@font-face{font-family:'Guildenstern NBP';font-style:normal;font-weight:400;font-display:swap;src:url(/vendor/guildenstern-nbp/GuildensternNbp.ttf) format('truetype');unicode-range:U+0400-045F,U+00AB,U+00BB,U+2014;}`;

// Guildenstern первым (кириллица), дальше Handjet-стек как фолбэк
// (латиница, № U+2116 и прочие зазоры Guildenstern).
export const GUILDENSTERN_STACK = `'Guildenstern NBP','Handjet','Pixelify Sans',monospace`;
