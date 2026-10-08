# SDD ledger вЂ” plan: docs/superpowers/plans/2026-10-08-rudaggerfall-localization.md
Pre-flight: Task1 produces t/setLocale/getLocale; Task2 consumes getLocale (С€СЂРёС„С‚ РіСЂСѓР·РёС‚СЃСЏ РІСЃРµРіРґР°) вЂ” РєРѕРЅС„Р»РёРєС‚Р° РЅРµС‚. Task7 consumes СЃР»РѕРІР°СЂСЊ Task5 вЂ” РїРѕСЂСЏРґРѕРє СЃРѕР±Р»СЋРґР°РµРј.
Task 1: RED вЂ” РїРёС€Сѓ С‚РµСЃС‚ РґРѕ РєРѕРґР°.
Task 1: complete (tests: node --test test/locale.test.js > 3/3 pass). Ruling: RuDaggerfall — отдельный пакет-оверлей, не форк 1610 файлов; t(params) поддерживает %s и {name}.
