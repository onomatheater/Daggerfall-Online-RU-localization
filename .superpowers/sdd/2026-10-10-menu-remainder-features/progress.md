# SDD ledger — plan: docs/superpowers/plans/2026-10-10-menu-remainder-features.md

Pre-flight: tasks share test/dfo-menu-rest.test.js (T1 produces key names,
T2 appends nothing — credits adds zero keys, T3 consumes en.json). No conflicts.

Task 1: complete (commits 71b8081, tests: node --test "test/*.test.js" → 95/95 at the time)
Task 2: complete (commit 621349e, tests → 96/96)
Task 3: complete (commit 8c9c3d4, tests → 99/99, tools/menu-cover.mjs → MENU-COVER OK)

Final: review (subagent, range 9650721..HEAD): 0 Critical, 5 Important, 5 Minor.
Final: fixed travellers-tail half-sentence — test/dfo-menu-rest NEED+eq RED→GREEN, suite 101/101.
Final: fixed guard blind spot — risk rows now reported (RISK lines, exit only on hard misses); fixture RED→GREEN, MENU-COVER OK (14 review-risk noted).
Final: fixed vacuous name guard — substring-smuggle assertion added, suite green.
Final: Ruling: U+2039 finding downgraded to Minor — ‹ lives in latin subset
(cmap-verified), enhancedMenu buttons are DOM (per-glyph fallback renders);
SDF-atlas contract unaffected. Eye-check on next live probe stands. Cost if wrong: '? Навыки' on one button.
Final: Ruling: agoText plurals (minutes/hours ago) NOT fixed — needs loader ICU
wiring (morph.js exists, dfo holds zero object-keys, no consumer); fallback EN
is the contract for missing keys, not a bug. Follow-up: wiring batch. Cost if wrong: EN age text on old tiles (cosmetic).
Final: minor (deferred): shots term trio (Изображение/Снимок экрана/Нет снимков).
Final: minor (deferred): save.backing_up wording (Копирование vs Резервное копирование).
Final: minor (deferred): guard trimEnd can't catch trailing-space drift (documented).
Final: minor (deferred): SKIP pins 2/8 (reworded search-index → false-positive MISS noise).
Final: minor (deferred): U+2026 SDF note (DOM fine, classic-SDF would show ?).

Ruling: batch size 33→28 keys, not 37 — extractor slugs ≠ upstream ruTOr keys;
context probe of each call site showed hear_swings/hear_steps/controller_note/
show_travellers already keyed upstream, 'Modules.' is key.slice() prefix,
1632–1636 are itemText() search-index. Cost if wrong: a missing display string
— covered by menu-cover guard going forward.
Ruling: 'menu.outdoor_visible' new key dropped — upstream calls
ruTOr('dfo:menu.show_travellers') at that site; repo EN kept byte-identical
(incl. trailing space), RU mirrors it. Cost if wrong: duplicate keys for one string.
Ruling: menu.modules EN "Modules."→"Modules" reverted — the period belonged to
a code-const slice-prefix, the ruTOr call uses "Modules". Cost if wrong: EN-locale
shows a period the upstream never rendered. Guard test pins current bytes.
Ruling: saveTile `· ${when}` composites stay EN until a wiring/ICU batch —
standalone halves translated now (fallback pattern, G3-safe). Cost if wrong:
mixed render interim — logged in docs/outbox/menu-review.md.
Ruling: credits titles resolve via feat.*/bindgrp.* at wiring time; zero
dfo:credits.* keys (one home per string). Authors/contacts pinned untranslated
by dfo-credits-guard (59 names). Cost if wrong: duplicated translation memory.
Ruling: Task 3 guard is tools/menu-cover.mjs + fixture test, not a committed
tmp-path-dependent test (would break CI); drift procedure = run script on probe
refresh. Cost if wrong: drift caught by eye instead of test — accepted, script exists.
Ruling: docs/ is gitignored — plan file + menu-review.md stay local-only.
Commits contain code+tests only. Cost if wrong: none (local convention: todo.md also local).
Ruling (10.10, человек): wave-мержи wave1-pins/wave2-skyfix/wave2-testroom/
preset-note-7506/sec-sheet в dev легитимированы задним числом; todo
исправлен (ветки были влиты, план врал). Локальные трупы pull19-21 и
fix/ru-orthography удалены после проверки поглощения. Cost if wrong:
G4-нарушение уже в истории — принято как факт, дальше по слову.
Ruling (10.10, человек): Jagget — «отдано народу», ответа не будет;
ответственность (включая удаление) на человеке; отзыв = --drop.
AGENTS §0.2 и todo обновлены. Cost if wrong: удаление строк одной командой.
Ruling (10.10, человек): Guildenstern NBP завендорен явным решением как
исключение из OFL-only (CC BY-SA 3.0, ATTRIBUTION.md; в апстрим MIT — нет).
Парсер cmap: русское ядро 100%, зазоры — нерусские буквы + № U+2116
(№ → '?' до обхода). Тест test/guildenstern.test.js 7/7 RED→GREEN,
suite 126/126, feat/font-guildenstern влит в dev и запушен. Cost if wrong:
№ в UI как '?' — зазор залочен тестом, обход позже.
Ruling (10.10, человек): чистка remote — удалены 28 веток (23 влитые,
ancestor-проверка + 5 закрытых-поглощённых #19-21/#31/menu2, PR CLOSED
проверен). main/dev не тронуты, открытых PR ноль. Бекап до удаления:
.superpowers/backup/origin-2026-10-10.bundle (verify OK) + карта SHA.
Откат: git push origin <SHA>:refs/heads/<ветка>. Prune убрал и stale
трекинги fontscale-v2/v3. Тесты после: 126/126.
Ruling (10.10 вечер, PR #33): меню-финал — 3 research-субагента (NEED 31 +
QA 19+32) + ручная верификация КАЖДОГО подозрения по ванили dfjs-clean.
Итог: 49 RU-фиксов, 24 новых ключа, 9 подозрений отклонено (рецензенты
ошиблись: pack-инвентарь, hidden-плюрал, reclaim/sync верны, darkelf male,
fontscale EN Size, bindgrp краткость). String-triage: титулы патронов —
серверные ключи, не переведены (deferred). Probe-wiring новых ключей и
глазная проверка — следующий шаг, нужен taskkill+запуск. Тесты 130/130,
MENU-COVER OK по ванили (грязное дерево даёт 1 MISS — артефакт пробы
fontscale RU-дефолт, чинить в пробе EN-дефолтом). Cost if wrong: неверный
нюанс в 49 строках — каждая сверена с call-site, тесты точных значений.
Ruling: PR #33 влит в dev по слову «мерж» (gh merge), ветка удалена
локально и на remote, dev запушен/подтянут, тесты на dev 130/130,
открытых PR ноль.
Ruling (10.10 вечер, проба): апдейтер гнался 7506→7524→7542→7553 за день;
проба на 7553 (дрейф точечно, world/testRoom ханки поверх, 2 ребилда).
Косяки пробы и фиксы: J() писал undefined-дефолты (префикс в lookup) —
починено вторым патчем; запятая после ?-ветки ломала билд; launcherRu MAP
и index.html-статика дублируют dfo:launcher (табличные правки не доходили
до экрана — починено, унификация deferred). yml отведён до конца глазной
(прецедент «возвращать» нарушен сознательно: каденс убивает пробу за минуты).
Глаз: лаунчер/рельсы/настройки RU. PR #34 открыт (no_check), ждёт «мерж».
Ruling (10.10 ночь, скорость): критика «2 часа кликов» принята. Построен
headless-DOM-пайплайн (tmp/dom-probe.cjs: preview+Chrome CDP, intro→menu→
settings, UNION виртуального скролла, оверфлоу-скан, DOM-PROBE OK) + doctrine
в todo (уровни 1-статика/2-headless/3-глаз; запрет foreground/кликов при
работе человека). Побочный улов: overhaulsLinkRow EN (wiring следующим
батчем, ключи переиспользуются), VSync в headless отсутствует (capability,
держит статика). PR #35 открыт (wire-check), ждёт «мерж».
Ruling (10.10 ночь): PR #34 и #35 влиты по слову «мерж» по очереди (fetch,
тесты, gh merge, pull, удаление ветки везде, тесты снова). Открытых PR ноль.
Новое правило в AGENTS §5: один открытый PR за раз, следующий — только после
мержа (накопление запрещено). Headless — только через chrome-headless.ps1
(--mute-audio, отдельный профиль); чужие процессы бьём только точечным
матчем (порт/имя), не масочным taskkill.
Ruling (10.10 ночь, очередь §7 п.1): wiring-батч готов — PR #36 ЕДИНСТВЕННЫЙ
открытый (boss.count_fell RED→GREEN + overhauls reuse, 140/140, DOM-PROBE OK
с новым ассёртом). H2 и титулы ждут мержа (MUST §5). AGENTS §3.1/§7 дополнены.
Ruling: PR #36 влит по «мерж» (тесты до/после зелёные, ветка удалена везде,
dev 140/140, открытых PR ноль). Берусь за H2-экраны (п.2 очереди §7).
Ruling (11.10, GRILL-фиксы по плану docs/superpowers/plans/2026-10-11-grill-fixes.md): устранены 6 ISSUE + 5 GAP + 12 MINOR (в отчёте было заявлено 9 MINOR — пересчёт дал 12, честно фиксирую). AGENTS: очередь §7 (мёрж #37 ждёт), убран дубликат лимита PR, §3.1 клики=всегда, откат через vanilla-asar, tools+wire/ru-scan, §2 aspirational-пометка, 600 из scale.js, menu-cover в §1, живой пин пробы — в todo. SDD: гейты G0-G4 в mapping, шаг 6 по уровням, стеки только по слову, план-абзац для >50 ключей, NEED-конвенция, битые ссылки исторические, самопроверка Chrome, дефолт 120с. Скилл: Gate 5 переписан по статистике (RU короче >20% — 16.3% корпуса=норма; риск — длиннее >50%, 10.3%), Gate 8 ICU, Ё-строгость, Red Flag и four-gate→nine-gate подтянуты. Глоссарий: База интерфейса (18 пар, канон из таблиц, Apply/Close не найдены — не вписаны), Realm-нота к Фазе 6. G2 опровергнут проверкой: preview-up/down УЖЕ чистят протухшие PID — не тронуты. Тесты 143/143. Cost if wrong: правки только в локальных доках (в git не едут) — риск нулевой; неверный канон глоссария ловится exact-тестами.
Ruling (11.10, самопроверка GRILL-фиксов): found 1 live bug — глоссарий потерял строку Daedra-принцев моим же edit'ом, восстановлена, diff чист (только intended). skills/ — трекаемые файлы: правки вынесены из feat/shots-tail в feat/skill-grill-fixes от dev (d017724, запушено, тесты 140/140 на базе dev), PR НЕ открыт (MUST один PR: ждём мержа #37). AGENTS/SDD/todo — gitignored, правки только в рабочей копии. .gitignore(login.md) и .mma/ — чужие/предсуществующие, не трогал. Ветка возвращена на feat/shots-tail.
Ruling (11.10, shots-tail QA): разбор 5 ключей — press_key/download_line OK; kept_count (калька выгружаются + согласование при count=1), empty_hint (согласование + пассив), outdoors_note (оборот называет) — замены готовы. Решение человека: вариант A — #37 вливается как есть, фикс отдельным микробатчем fix/shots-tail-qa после мержа. Ветку фикса до мержа не создаю (MUST один PR, стеки — по слову). Cost if wrong: EN-fallback держит, дефекты косметические.
Ruling (11.10, мерж #37): fetch, тесты 143/143 на ветке, gh merge (MERGEABLE), dev fast-forward 023346b, ветка удалена везде, тесты на dev 143/143, открытых PR ноль. Следом — fix/shots-tail-qa (вариант A); feat/skill-grill-fixes ждёт своей очереди PR (один за раз).
Ruling (11.10, fix/shots-tail-qa): RED увиден (kept_count), 3 RU-правки + фикс startsWith-ассёрта (мой же тест), GREEN 143/143 + WIRE-CHECK OK. Коммит f67cddd, запушено, PR #38 открыт (ЕДИНСТВЕННЫЙ; skill-PR ждёт). Урок: бэктик в gh --body ломает PowerShell — тела PR без бэктиков.
Ruling (11.10, мерж #38): fetch, 143/143 на ветке, MERGEABLE, влит (7440020), ветка удалена везде, dev 143/143, открытых PR ноль. Остаток: PR для feat/skill-grill-fixes (ребаза на свежий dev перед открытием), затем H2 (§7 п.2).
Ruling (11.10, skill-PR #39): ветка rebased-then-merged (force-push не применялся — reset+merge origin/dev), тесты 143/143, запушено, PR #39 открыт ЕДИНСТВЕННЫМ. H2-recon (без ветки, §5: работа ждёт мержа): ключи online-NEEDs УЖЕ в репо с RU (online_needs_an_account, no_saved_games, an_offline_character..., explainer_shared/clock, bring_offline_once) — остался чистый wiring: enhancedMenu.js:1150 empty() с голыми литералами, :1224 undo-диалог, :1327 copy_done (ключи realm.undo_body/undo_done/copy_done сверить с репо). Plus-card: в dom-probe только note, discovery-проход не сделан. Следующий батч: feat/online-needs-wiring после мержа #39. Cost if wrong: голый EN в online-пане до wiring — fallback по контракту, не баг.
Ruling (11.10, мерж #39 + инцидент .gitignore): fetch, 143/143, MERGEABLE, влит (028592f), ветка удалена везде, dev 143/143, открытых PR ноль. ИНЦИДЕНТ: мой git reset --hard при отмене ребейза снёс чужое незакоммиченное изменение .gitignore (+login.md/login*) — восстановлено теми же двумя строками (файл login.md цел, был untracked). Урок: reset --hard при грязном дереве запрещён себе навсегда — только stash-путь. Следом — feat/online-needs-wiring (H2, авторизован как шаг 2).
Ruling (11.10, feat/online-needs-wiring, PR #40 ЕДИНСТВЕННЫЙ): контракт-тест (12 NEED + exact RU, RED=отсутствие undo_button), 1 новый ключ realm.undo_button (Отменить перенос, QA: back-translate Cancel the transfer + консистентность с undo_body). Проба: patch-7553-online-needs (5 якорей, 1 прогон) — empty:1150, Play:1219, undo:1224, copy:1327; таблицы синкнуты; build 1m58s зелёный; все 7 маркеров в бандле; dom-probe чинён по ходу (задвоенный for+try в world-блоке, noClicked scope, shots-ассёрты под новые RU, online-ассёрты) — DOM-PROBE OK. Глаз по сэмплу: СОХРАНЕНИЙ НЕТ + an_offline RU на экране; explainer-EN + SIGN IN — вне скоупа (следующий батч). Teardown точечный (preview PID + headless-порт). Test Room: offline only + SYNC-note — в unwired-list. Cost if wrong: wiring правится в tmp, репо — только таблицы+тест.
Ruling (11.10, мерж #40): fetch, 143/143 на ветке, MERGEABLE, влит (ca96429), ветка удалена везде, dev 143/143, открытых PR ноль, висяков ноль. Следующий кандидат: explainer+SIGN IN wiring + Plus-card discovery (H2-хвост).
Ruling (11.10, feat/online-explainer-signin, PR #41 ЕДИНСТВЕННЫЙ): контракты (dfo-plus.test.js 16 NEED + exact, online_needs/signin asserts), таблиц ноль (всё reuse). Проба: patch-7553-plus-signin 14 якорей с 1 раза; build зелёный; маркеры в бандле; dom-probe: explainer+SIGN IN RU на экране с 1 прогона; Plus: 3 итерации (look-gated ряды → ctx-диагностика → aria не в innerText) — итог DOM-PROBE OK, ряды RU на экране (ЦВЕТ ИНТЕРФЕЙСА/КРОССБАР/БЕГ...). Инфра прибита точечно, прогонов headless 4 на одной поднятой паре (без новых процессов). CRLF-warning по новому тесту — ложный (autocrlf-нормализация, blob идентичен, коммита нет). Находки в очередь: raw IN USE (нужен ключ), Test Room: offline only, SYNC-note. Тесты 146/146. Cost if wrong: wiring в tmp правится, репо — только тесты.
Ruling (11.10, мерж #41): fetch, 146/146 на ветке, MERGEABLE, влит (ae18bec), ветка удалена везде, dev 146/146, открытых PR ноль, висяков ноль. H2-хвост по §7 п.2 закрыт частично: остались титулы патронов (п.3), IN USE-ключ, Test Room: offline only.
Ruling (11.10, titles-triage, PR #42 ЕДИНСТВЕННЫЙ): playerBadge.js прочитан целиком — словарь из relay-бандла (wire-ID lower-case), 30 титулов + 8 аур. Вердикт proper по трём основаниям (личные гранты/тиры Mac/wire-общность). Гвард test/dfo-titles-guard.test.js: RED на quest-herald широкой версией → сегментное совпадение по 38 wire-ID + allowlist. Тесты 147/147. §7 и todo-очередь закрыты. CRLF-warning нового теста — ложный (нормализация, как с dfo-plus).
Ruling (11.10, мерж #42): fetch, 147/147 на ветке, MERGEABLE, влит (e95605f), ветка удалена везде, dev 147/147, открытых PR ноль, висяков ноль. Очередь §7 закрыта полностью.
Ruling (11.10, feat/probe-rebase, PR #43 ЕДИНСТВЕННЫЙ): инструмент + очередь(51) + 11 тестов, suite 158/158. Оценка в worktree: dry-run 7506→7553 (5 ATTN), apply-стоп на floor + restore в ноль (после фикса lifecycle-бага: пустой stash-pop врал restored — теперь checkout+pop+clean-untracked, успех тоже pop'ает). Fault: отказ на грязном, missing-скрипт, маркер пережил цикл. Реальный dfjs: 125 грязных до=после. CRLF-warning — шум (blobs везде LF).
Ruling (11.10, мерж #43): fetch, 158/158 на ветке, MERGEABLE, влит (849a59a), ветка удалена везде, dev 158/158, открытых PR ноль, висяков ноль. Вариант D закрыт. Дальше — добивание перевода (Фаза 2) по слову.
Ruling (11.10, docs-rev): % меню честно: таблицы 1542/1542 (100% известных ключей), headless-экраны без EN-остатков; остаток 7 сайтов (~10 строк: agoText×3, SYNC note/go/title, syncWord, IN USE, TestRoom) + live-глубина + отложенное → сводка ~95% фичи. Доки: todo (PR #37-43, H2, Plus, морфология-остаток), AGENTS §7 (новая очередь) + §4 (три слоя: продукт/проба/гварды — раньше архитектура жила только в чате), SDD актуален, skills актуальны, probe-queue новый. inject/README (трекаемый): якори помечены историческими + ссылки (PR #44). По ходу поймана своя ошибка (tOr в продукте) — исправлена до отчета. Cost if wrong: % — оценка, не гвард; остаток перечислен поименно.
Ruling (11.10, мерж #44): fetch, 158/158 на ветке, MERGEABLE, влит (ea87123), ветка удалена везде, dev 158/158, открытых PR ноль, висяков ноль. Документация синхронна. Следующее — морфология-батч (§7 п.1) по слову.
Ruling (11.10, feat/morph-batch, PR #45 ЕДИНСТВЕННЫЙ): паттерн plural-объекты + tp() (Ruling: объекты в ОБЕИХ таблицах, fallback строкой, params в tp запрещены молча — t() с params на объекте упал бы). 8 ключей (QA: выгружаются→нет, согласование номиналами). По ходу: credits-guard ронял suite на объектах — закалён; свой опечаточный [k]/[key] пойман дампом байтов. Проба: 13 якорей с 1 раза, build зелёный, маркеры в бандле, DOM-PROBE OK (СИНХРОНИЗАЦИЯ/ИСПОЛЬЗУЕТСЯ на экране). agoText-рендер: tp-юнит + маркеры; глаз с сейвами — live-очередь. Тесты 163/163. Cost if wrong: ICU-форма неверна — видно сразу на склоне 1/2/5 (тест держит).
Ruling (11.10, мерж #45): fetch, 163/163 на ветке, MERGEABLE, влит (68acc01), ветка удалена везде, dev 163/163, открытых PR ноль, висяков ноль. §7 п.1 закрыт. Дальше — Фаза 2 (BIOG) по слову.
Ruling (11.10, feat/biog-batch, PR #46 ЕДИНСТВЕННЫЙ): Фаза 2 открыта — checkBiogPair (TDD: RED импорт + правило 12→паритет) + BIOG00 целиком (12Q/~65A, свежий перевод — Jagget не содержит BIOG). Валидатор поймал 2 моих дефекта (слияние строк Q6, потеря SUB) — чинено до коммита; чекер усилен tail(). Конвенции: ты-обращение, Плут/Импы/золотых — в глоссарии. CRLF 1:1 (223 сегмента). Глаз chargen — live-очередь (headless не ведёт создание персонажа). Тесты 165/165. Осталось 17 файлов тем же конвейером. Cost if wrong: строка не влезла в UI — формат держит число строк, длины — глазом.
Ruling (11.10, rebase-7815 LIVE): drift 7553→7815 = 40 ATTN; полный replay в worktree (v6 order: probe>forceru>sdf>fontstack>fontfull>fontscale>floor>+locale-default ранний) — адаптации копий: rails (menuLabel владеет), restore (menu3/menu2/700b владеют), binds (head→intro), settings (labelOf у rails), comma/tipfix после tail2, shots Spawn у spawn, plus hover-ряд умер upstream, world import merge, fix-700b-latin и acct-tail выбыли (устарели). 50/50 REBASE OK. Build + маркеры + wire-check + DOM-PROBE OK (118313d43600). Asar-хирургия: live-распаковка + wt-dist + main.cjs + launcher-оверлей, version 0.1.7815 (иначе гейт релея!). Своп после taskkill (процессов уже не было); бэкап 7553 в tmp. yml по-прежнему отведён (иначе апдейтер снесёт). PR #46 (BIOG) всё ещё открыт — ребаз его не касается. Cost if wrong: stale-билд исключён цепочкой (build→маркеры→asar-verify→swap).
Ruling (11.10, мерж #46): fetch, 165/165 на ветке, MERGEABLE, влит (880e3e3), ветка удалена везде, dev 165/165, открытых PR ноль, висяков ноль. Фаза 2: 1/18 файлов. Живая проба на 7815 у человека (глаз).
Ruling (11.10, релиз main): CONTRIBUTING.md прочитан (скоуп переводчика: только Value+QRC, тесты не ослаблять, PR только в dev — совместимо с уставом). Секреты: login.md ignored+untracked, в коммиты не попадал — проверено ls-files. PR #48 dev→main CLEAN (конфликтов ноль), влит, main 165/165, тег locale-v1.1 запушен. Ветки чистые (только main+dev). Обратно на dev.
Ruling (11.10, feat/menu-grimoire-credits ПЛАН-АБЗАЦ): остаток главного меню по menu-cover на ванили 7815 — 3 hard-MISS (Pages/Backdrop/Vitals, лейблы choiceRow гримуара enhancedMenu.js:3560-3562) плюс 8 опций из grimoireDress.js. Spellbook-лейбл — reuse существующего значения. Задача 1: 11 новых ключей dfo:grim.* (EN байт-в-байт, RU по слову человека). Задача 2: проза credits — 51 ряд, 100 блоков what/terms, около 28 тысяч знаков; title/author — proper под гвардом; ключование по индексам; wiring в пробе. Writing-plans хотел план-документ в docs, но AGENTS и SDD запрещают отдельные spec-файлы — план живёт здесь абзацем плюс NEED в тестах; AGENTS выше скилла. Cost if wrong: неверный нюанс опций скина — косметика, тесты точных значений держат.
Ruling (11.10, feat/menu-grimoire-credits ГОТОВО, PR #67 ЕДИНСТВЕННЫЙ): задача 1 — тест RED увиден (t вернул сырой ключ), 11 пар, GREEN, коммит 57e9adc. Задача 2 — 4 субагента-черновика по QA-гейтам, моя вычитка поймала 3 дефекта (mixed-script similары-вепри в mods.0, полоса против линейки в mods.18/24 — нормализовано на линейку); механика всего корпуса — глобальный ru-scan-гвард (0 issues), поэтому точные RU-пины в тесте только заголовки плюс блоки-свидетели (отклонение от конвенции зафиксировано в шапке теста). Вставка 102 пар — скриптом tmp/credits-insert.mjs (2 итерации: якорь рвал ключ, затем забытые запятые — файлы не пострадали, JSON.parse до записи). CRLF без BOM сохранены, lone-LF ноль. Итог: suite 182/182, MENU-COVER OK (0 missing). Коммит 6bab48f, todo-флажки сняты, PR #67 открыт. Wiring (choiceRow ruTOr, creditsCard) и глаз — следующий шаг в пробе, не в этом PR. Cost if wrong: неверный нюанс прозы мода — правится Value плюс ассёрт тем же коммитом по CONTRIBUTING.
