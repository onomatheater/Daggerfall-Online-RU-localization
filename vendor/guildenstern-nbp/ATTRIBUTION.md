# Guildenstern NBP — attribution and vendoring decision

- **Author:** Nate Halley (FontStruct, 2013-05-01, v1.0).
- **License:** Creative Commons Attribution-ShareAlike 3.0 (CC BY-SA 3.0).
  Original notices: `readme.txt` ("give me credit") and `COPYRIGHT.txt`.
- **Files:** `GuildensternNbp.ttf` (headings) and `RosencrantzNbp.ttf`
  (body text) are vendored together as one distribution unit. The selected
  display face is **Guildenstern**.
- **Explicit human decision, 2026-10-10:** Vendor this family as an exception
  to the project's OFL-only requirement. It was the only verified readable
  pixel-font option with Cyrillic found after substantial evaluation. The
  decision-maker accepts responsibility for the consequences, including
  removal of the files.
- **Limits of that decision:**
  - Do **not** propose this font for the MIT-licensed upstream
    `daggerfall-js-source` project without a separate review of the CC BY-SA
    versus MIT licensing implications.
  - ShareAlike applies to derivative font versions: they remain CC BY-SA and
    must credit the author.
- **Known character-coverage gaps** (cmap parser; see
  `test/guildenstern.test.js`): the Russian core is fully covered (А–Я, а–я,
  Ёё, «», —). Missing characters are Єє, Іі, Ѐѐ, Ѝѝ, Ґґ, Ұұ, and the number
  sign **№ U+2116**. In Russian UI, № renders as `?` (`FNT_ERROR_CODE`); a
  workaround is needed, such as replacing it with “No.” or “number” in text
  shown in this font, or using a second font.
- **Source:** The upstream source is FontStruct.
