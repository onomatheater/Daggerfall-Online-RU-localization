---
name: ru-localization-qa
description: Use when writing or reviewing Russian game-localization strings, or when a RU translation reads as a calque, uses the wrong register, or mistranslates gamer terminology
---

# RU Localization QA

## Overview
A mistranslated UI string ships to every player. Every RU string passes the four-gate check below before it lands in a table.

## When to Use
- New RU table entries (`dfo:`, `-LOC`, launcher)
- Reviewing RU values for literalisms, typos, register slips, over-cute rewrites
- Fixing a player-reported bad string: screenshot → key → fix → exact-value test

When NOT to use: proper nouns, paths, IDs, ini keys, save/network content — those are never translated.

## The Gate
1. **Glossary first.** EN term in `glossary.md` → use that RU verbatim. No synonyms, no improvisation.
2. **Back-translate.** Render the RU back into English. If the meaning drifted, rewrite. («Установится до игры» → "will install until the game" ✗; «Установится перед запуском игры» ✓)
3. **Register: neutral-helpful.** No slang («сгинул»), no cuteness («парадная»), no mixed language («Проверить outdoors»), no verb-neologisms («Появить», «Ввезти» — rephrase with a noun: «Создание», «Импорт»). Short labels stay short.
4. **Consistency.** Same EN term **in the same context** → same RU in every table (grep). Divergences go to review, never auto-merged. Placeholders `{x}`/`%s` identical EN↔RU. Ё/ё where orthography demands.
5. **Structural parity.** EN artifacts are data, not text: `\r`, RSC quotes, trailing spaces, date/number format slots (`{5}`-style) stay byte-identical unless the formatter is verified. RU must not be shorter than EN by >20% (truncation flag) and must carry the same placeholder set.

## Quick Reference
| Check | How |
|---|---|
| Term known? | grep `glossary.md` |
| Meaning kept? | back-translate aloud |
| Same everywhere? | grep all tables for the EN |
| Placeholders? | `{x}` count EN == RU |
| Locked? | exact-value test (pattern: `ru-gamer-terms.test.js`) |
| Spacing artifact? | EN double space / RSC quotes / trailing space: mirror only if it renders identically; if importer noise → RU normalizes and the key goes to the documented allowlist in the guard test |
| Prompt `X: `? | trailing space required for the input field (EN hides it before the closing quote) |

## Common Mistakes
| Mistake | Fix |
|---|---|
| VSync → «Ждать обновления» | glossary: Вертикальная синхронизация |
| Proper nouns translated (Steam, Daggerfall) | keep, never translate |
| Template halves as keys | whole message with `{placeholder}` |
| Typo slipped in («Полы здоровья») | back-translation read-aloud catches it |
| Doubled EN space mirrored into RU | normalize, allowlist with reason — never mirror typos |

## Red Flags — STOP and re-run the Gate
- «И так поймут» / «дословно точнее»
- Term missing from glossary → added it first, then used it
- Back-translation skipped («очевидно же»)
- Same EN term translated two ways in the same context
- Placeholder added/removed/dropped vs EN
- RU visibly shorter than EN with no note → check truncation, not style
