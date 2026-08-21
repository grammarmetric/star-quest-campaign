# Star quest: the campaign

Live: **https://grammarmetric.github.io/star-quest-campaign/**
Teacher view: **/teacher.html**

Twelve weeks of A2 Key practice turned into one continuous game, built on top
of two existing repositories rather than beside them:

- **[star-quest](https://github.com/grammarmetric/star-quest)** — the adaptive
  Cambridge A2 Key (KET) mock assessment. It supplies the diagnosis this whole
  campaign is aimed at, and it *is* the Week 12 boss, unmodified, so the two
  runs compare honestly.
- **[star-quest-course](https://github.com/grammarmetric/star-quest-course)** —
  the 12-week study plan. Every region, week, source and page number here comes
  from that plan; nothing was invented for the game.

> **No student's name lives in this repository.** The name arrives at runtime
> through `?name=` or the welcome screen, is kept in its own localStorage key,
> and is deliberately excluded from save codes and save files. Same convention
> as star-quest.

## What the game is

Five regions on one map, walked in order, with an avatar and XP that persist
across all twelve weeks:

| # | Region | Weeks | What it fixes |
|---|---|---|---|
| 1 | Weather Coast | 1–2 | Answering before the sentence has changed tense |
| 2 | Vowel Hollow | 3–5 | The quiet middle syllable that turned *camera* into `camroa` |
| 3 | Story Marsh | 6–7 | Reading the situation instead of the sign |
| 4 | Ceiling Peak | 8–10 | Two ceilings the diagnostic never actually found |
| 5 | The Summit | 11–12 | A full paper, then the real test again |

Each week has three quests; the last week of a region has a boss. A region
opens when the one before it is finished, boss included.

**300 authored items** across six interaction types — multiple choice, picture
choice, sentence building, letter-tile spelling, two-bucket sorting, and
list matching.

### The one mechanic that matters

On 20 August she scored 17/20 and averaged **nine seconds a question** in
listening — and the single listening item she lost was the one built to punish
answering early:

> "It **was** lovely and sunny **this morning**, but look outside **now** — it**'s
> raining** again."

She answered *sunny*. So every listening item in this game carries
`gate: "audio"`: **the answer buttons are disabled until the clip has finished**
and a short settle time has passed. The rule is enforced by the interface
rather than by asking a seven-year-old to be patient. The teacher view reports
how many gated items she has met, because that number is the point.

### A deliberate departure from the design document

The GDD asks for a per-domain personal-best **time**. Taken literally that
rewards the exact habit the diagnostic caught. So time is recorded and shown as
*information*, and the number she is invited to beat is **accuracy**, plus a
"waited for the end" count. Speed is never the target.

## Saving

Three paths, all offline — no backend, no account, no Firebase.

1. **Automatic** — localStorage, after every quest.
2. **A save code** — the whole campaign packed into a URL fragment, the same
   trick star-quest uses for its report handoff. Fragments never reach a
   server. Paste it into any browser to resume.
3. **A save file** — a small JSON download the teacher keeps and re-loads at the
   start of the next lesson, so nothing depends on her device.

`teacher.html` reads any of the three and reports where she is, which ceilings
have moved, and what to put in the mystery box.

## About the artwork

The card and poster images are **Oxford Discover 1 courseware** — 241 flashcards
and 9 Discover posters, extracted from the disc and downscaled. They are wired
in and work, but `assets/` is **untracked by default**, because this repository
is public and those images are the publisher's, not ours.

The game degrades cleanly: a missing card image renders as a lettered tile with
the word on it, and the poster panel removes itself. Nothing breaks.

To use the art locally, just build it — the files are already on disk. To
publish it anyway, that is a one-line decision:

```sh
git add -f assets/          # ~12MB: 241 cards + 9 posters
```

Do that only if you are comfortable redistributing the images publicly. The
alternative that keeps everything legitimate is to run the game locally during
the lesson, which is a screen-share anyway:

```sh
npx serve .                 # then open http://localhost:3000
```

## What's in the box

```
index.html          the game
teacher.html        progress reader
styles.css          design system, kids adaptation
js/campaign.js      screens, map, quest runner, rewards
js/engine.js        item renderers + the audio gate
js/progress.js      the three save paths
js/cards.js         241 labelled flashcards, themed by region
js/icons.js         inline SVG
js/teacher.js       the teacher report
content/            campaign.json + week01..week12.json
assets/             card and poster images (untracked — see above)
```

No build step and no dependencies. The pages fetch JSON, so they need to be
served over http — `file://` will not work.

## Styling

GrammarMetric design system, kids adaptation, same tokens as star-quest:
Lexend, the five-role electric palette, light mode default, flat surfaces,
18px base and 88px tap targets. Motion is relaxed for reward feedback only.

**Carried fix**: `:root[data-theme='dark']` only lands on the root element, so
any nested `[data-accent]` section re-declares `--accent-outline` back to the
light-mode darkened hue and goes near-invisible on black. Every accent has its
own descendant rule here, and a headless test asserts none of them resolve to
`#736f00 / #3d0f00 / #5c005c / #006666` in dark mode.

Red (`--gm-error`) is a highlight only. It appears on the Week 6 "below her
level" flag and on a wrong answer — never as routine chrome.

## Verification

Three harnesses, all passing:

- **content validator** — 300 items: answer-in-options, tiles that can actually
  build their sentence, letter pools that can actually spell their word,
  bucket indices, match targets, unique ids, region/week coverage, and enough
  distinct cards for every quest to pay one out.
- **all-items harness** — drives all 300 items through the real UI and asserts
  every one is completable. Catches engine bugs the data check cannot.
- **playthrough harness** — welcome → map → region → a full ten-item gated
  quest → reward, plus region gating, boss unlock and rewards, the Summit
  hand-off, the mystery box, save-code round trip on a fresh device, the
  teacher view, dark-mode contrast, and a clean console.

## Updating

If a later assessment comes in, re-derive rather than patch: read the report
link's URL fragment for per-item answers and timings, find what she got wrong,
find the Oxford Discover unit that teaches that exact point, then the matching
KET paper part. The badge and boss names are diagnosis-specific and should be
re-derived too — they are named after *her* errors, not after generic
milestones.
