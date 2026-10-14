# CLAUDE.md — Seventy-Three

A static website for memorizing the **73 books of the Catholic Bible** in order: which section each belongs to and roughly what each teaches. It's built for one owner (Carter) who uses it for real study, so the behavior choices recorded below came from hands-on feedback and matter. Keep them unless asked to change them.

- **Live site:** https://73.carterscoding.com (GitHub Pages from `main`; the domain is set by `CNAME`, so don't delete or edit that file).
- **Repo:** `cksarge/Books-of-the-Bible` (`origin`, over HTTPS). Work now happens in a local clone. Earlier work happened in a cloud session on `claude/awesome-hawking-0c9wwo` and was merged into `main` through PRs #1–#3. The owner has asked for work to go **directly on `main`** now.
- **Pushing `main` deploys.** GitHub Pages publishes whatever is on `main`, so a push goes live within a minute or two. Run the checks below first.
- **Stack:** plain HTML + CSS + vanilla JS. **No build step, no framework, no runtime dependencies.** Opening `index.html` straight from disk (`file://`) must keep working.

---

## Quick start

```sh
# view the site (any static server works; this one has no dependencies)
node tests/serve.js 8173        # then open http://127.0.0.1:8173
# or just open index.html in a browser

# tests (optional, need Node 18+)
npm install                     # installs playwright (dev only; version pinned by package-lock.json)
npx playwright install chromium # one-time browser download (repeat after a playwright upgrade)
npm run test:match              # answer-matching unit tests (no browser)
npm run test:smoke              # every page + every activity, phone + laptop, fails on JS errors
npm run test:path               # auto-plays all 108 path stops (~10–25 min)
WRONG=4 npm run test:path       # same, but misses every 4th first attempt (tests the fix-mistakes loops)
```

Test screenshots and the final progress backup go to `tests/out/` (git-ignored). `node_modules/` is git-ignored too; `package-lock.json` is committed. `MAXSTEPS=600 npm run test:path` is a quick partial run of the path.

**Before every commit:** run `node --check js/*.js`, then `npm run test:match` and `npm run test:smoke`. For any change to the path, scoring, quizzes, sheets, or games, also run `npm run test:path` (and ideally `WRONG=4`).

**Before every deploy that changes files:** bump `CACHE` in `sw.js` (currently `seventy-three-v3`). The service worker is network-first, so a stale cache only matters offline, but bumping keeps installed copies clean.

---

## Files

| File | Lines | What it holds |
| --- | --- | --- |
| `index.html` | ~60 | Shell: top bar (logo, desktop nav, ★ and 🔥 pills, ⚙️), `<main id="view">`, phone tab bar, `#toasts`. Loads the scripts **in order** as classic `<script>` tags. |
| `js/data.js` | ~210 | `BB.SECTIONS`, `BB.BOOKS` (73 entries), `BB.STAGES` (13 path chunks + mnemonics), `BB.ERAS` (timeline), `BB.COUNT_TIP`. Helpers `BB.book(n)`, `BB.sec(id)`, `BB.stageOf(n)`, `BB.eraOf(n)`. |
| `js/core.js` | ~565 | `BB.U` utils, `BB.match` (answer matching), `BB.store` (localStorage), `BB.sfx` (WebAudio + vibration), `BB.fx` (confetti/shake/pop/burst), `BB.ui` (chips, stars, toast, modal, confirm, scroll lock, book info, typed answer box), `BB.pools` (book ranges), `BB.redact`, `BB.starsFor`, `BB.askSummaries`, `BB.SUMMARY_OPTIONS`. |
| `js/engine.js` | ~380 | `BB.def` / `BB.acts` (activity registry), `BB.run` (activity shell), result + stars screen, `BB.retryMissed`, `BB.fixMistakes` (post-game fix round), `BB.Sheet` (recite sheet), `BB.fixLoop` (sheet fix loop), `seq` activity (multi-part stops). |
| `js/quiz.js` | ~365 | `BB.quiz.gen` (question generator), `BB.quiz.play` (question player with retry queue, lives, timers), `BB.quiz.summarize`, activities `quiz` and `daily`. |
| `js/study.js` | ~405 | `BB.mnemonicHtml`, `BB.editMnemonic`, `BB.timelineModal`, activities `lesson`, `flash`, `fade`, `test`. |
| `js/games.js` | ~920 | Activities `order`, `speed`, `missing`, `match`, `sort`, `first`, `hood`, `survival`, `odd`, `mystery`, `shelf`, `unscramble`. |
| `js/path.js` | ~295 | `boss` activity + `BB.bossParts`, every path stop, `BB.path` API, the seeded `trail()` layout, the path page. |
| `js/pages.js` | ~260 | Practice hub, generic setup forms, Books (reference), Timeline, Mnemonic builder, Progress, `BB.openSettings`. |
| `js/app.js` | ~66 | `BB.applyTheme`, `BB.updateHeader`, `BB.router` (hash routes), `BB.showWelcome`, service worker registration. |
| `css/style.css` | ~735 | All styles. Design tokens at the top, with light and dark themes. |
| `icon.svg` | — | Favicon / app icon, generated to match the header logo (see "Favicon"). |
| `manifest.webmanifest`, `sw.js` | — | Installable app + offline support (network-first cache). |
| `tests/` | — | `serve.js` (static server), `match.test.js`, `smoke.js`, `play-path.js`, `solver.js` (auto-player injected into the page), `tools/make-icon.py`. |
| `README.md` | — | User-facing feature overview. Keep it in sync when features change. |

All code hangs off one global, `window.BB`. Scripts are **not** ES modules, because modules break `file://`.

---

## Book data (do not change without being asked)

The canonical list and order came from the owner and must stay exactly as is. 46 OT + 27 NT, with section ids in brackets:

- **Pentateuch** [pent] 1–5 · **Historical Books** [hist] 6–21 · **Wisdom Books** [wis] 22–28 · **Prophets** [proph] 29–46
- **Gospels** [gosp] 47–50 · **History** [acts] 51 (Acts of the Apostles) · **Pauline Letters** [paul] 52–65 (includes Hebrews) · **Catholic Letters** [cath] 66–72 · **Apocalyptic** [apoc] 73
- **Deuterocanonical** (flag `deutero`, shown as a gold "DC" badge): Tobit, Judith, 1 Maccabees, 2 Maccabees, Wisdom, Sirach, Baruch.
- Each book: `{ n, name, abbr, sec, tag, summary, aliases[], testament, deutero, strictAlt[] }`. `tag` is a 3–6 word gist used in matching games and feedback; `summary` is 1–2 sentences on what the book is about and what it teaches. `strictAlt` only gives "Acts" for book 51.
- **Section colors** (one per section, used everywhere): CSS variables `--c-pent`, `--c-hist`, …, `--c-apoc` in `:root`, redefined lighter for dark mode. Any element with `data-sec="<id>"` gets `--c`, `--c-soft` and `--c-ink` automatically. Use that instead of hard-coding colors.
- **Timeline eras** (`BB.ERAS`, 11 of them) place each book by where its story is set. Every book is in exactly one era (the match test checks this). Judgment calls: Job → Patriarchs, Obadiah/Tobit/Judith → Exile, Esther → Return.

### Path stages (`BB.STAGES` in data.js, 13 chunks)

| # | id | Title | Books | Two games | Ready-made mnemonic |
|---|---|---|---|---|---|
| 1 | pent | The Pentateuch | 1–5 | order, match | Good Elephants Like Nice Dates |
| 2 | hist1 | Conquest & Kingdom | 6–10 | missing, first | Just Judge Ruth, Sam & Sam |
| 3 | hist2 | Kings & Return | 11–16 | shelf, hood | Kings Keep Crowns Carefully, Even Now |
| 4 | hist3 | Heroes & Maccabees | 17–21 | unscramble, survival | Tiny Judy Eats Many Muffins |
| 5 | wis | The Wisdom Books | 22–28 | mystery, match | Just Pray, Ponder, Expect Songs of Wisdom, Sir! |
| 6 | proph1 | The Major Prophets | 29–34 | order, unscramble | I Just Love Big Eggs, Dad! |
| 7 | proph2 | Minor Prophets I | 35–40 | survival, missing | Hot Jam And Oatmeal, Just Mmm! |
| 8 | proph3 | Minor Prophets II | 41–46 | unscramble, shelf | Nice Hats, Zany Hats, Zero Money |
| 9 | gosp | Gospels & Acts | 47–51 | speed, match | Many Men Love Jesus' Apostles |
| 10 | paul1 | Paul's Great Letters | 52–55 | hood, first | Rich Cookies Crumble Gently |
| 11 | paul2 | Prison & Hope Letters | 56–60 | order, mystery | Eat Pop Corn, Then Talk Twice |
| 12 | paul3 | Pastors & Friends | 61–65 | unscramble, survival | Tim, Tim, Titus Plays Hide-and-seek |
| 13 | cath | Catholic Letters & Revelation | 66–73 | shelf, speed | James, Peter ×2, John ×3, Jude — then Revelation! |

---

## The path (home screen) — 108 stops, 18 sections

Each section has a banner: "Stage N" for stages, "Checkpoint 1/2" or "Final Checkpoint" for checkpoints.

```
Stage 1  pent   : pent-lesson, pent-flash, pent-quiz, pent-g1, pent-g2, pent-boss
Stage 2  hist1  : (same 6 stops)
Stage 3+ ...    : review-<stage> first (stages 3–8 and 10–13), then the same 6 stops
Checkpoint 1     : final-ot   (Old Testament Final — test sim 1–46)          ← after Stage 8
Stage 9–13 ...
Checkpoint 2     : final-nt   (New Testament Final — test sim 47–73)         ← after Stage 13
Stage 14 fr1 "Final Review 1": fr1-flash (Weak Spots), fr1-quiz, fr1-sort, fr1-order, fr1-missing,
                               fr1-odd, fr1-mystery, fr1-shelf, fr1-boss "Boss: Final Review 1" (rapid fire + survival 1→73)
Stage 15 fr2 "Final Review 2": fr2-flash (Summary Cards / Section Cards), fr2-match (section), fr2-first,
                               fr2-hood, fr2-unscramble, fr2-quiz (typed), fr2-speed, fr2-boss "Boss: Final Review 2" (rapid fire + put in order)
Final Checkpoint : final-all  (Grand Finale — test sim 1–73)
```

- **Stop ids are permanent.** They key saved stars in `localStorage`, so never rename one. `final-all` kept its id when it moved. New stops get new ids.
- **Unlocking:** stop *i* is unlocked once stop *i−1* has ≥1 star. Stars: ≥90% → 3, ≥70% → 2, ≥50% → 1 (`BB.starsFor`). Accuracy counts a hinted answer as half (`(correct − 0.5·hinted)/total`). A failed boss (out of lives) gives 0 stars.
- **Review stops** are `seq` parts: 10 mixed questions on books 1–(previous stage end), then a rotating game (`REVIEW_GAMES` in path.js: sort/odd/first/missing/shelf).
- **Stage bosses** (`BB.bossParts`): rapid fire with 10 typed questions (3 lives, 30 s each, boss HP bar), then "Final blow: recite it all" on a recite sheet covering **the section so far** (e.g. Historical Books stage 2 covers 6–16). This recite step **does** have the fix-mistakes loop (`fixMistakes: true`).
- **No hints in bosses or finals** (owner request). Every boss part (stage bosses, the practice Section Boss Round, fr1-boss, fr2-boss) and the three test-sim finals pass `hints: false`, which hides the 💡 button in `quiz.play`, `survival`/`missing`, recite sheets, and the post-game fix round (`BB.fixMistakes` passes the part's `hints` on). Elsewhere hints stay on by default.
- **Checkpoints** are separate sections (`CHECKPOINTS.cp1/cp2/cp3` in path.js) with dark banners, a gold border and a 🏆 (deliberately *not* plain gold, which would look like the gold Gospels stage). A section with one stop centers it.
- **Trail layout** (`trail(key, n)` in path.js): each section gets its own random wander, **seeded by its id** so it looks the same every visit. Each step sideways is capped at `MAX_STEP = 24` (% of width). The owner asked for random shapes but **no big jumps between neighboring stops** (about ≤100px on a phone). Rows are `ROW = 136` px apart; node x is clamped to 20–80%.
- **Path header:** position (📍 done/108), total stars, streak, a colored book strip, an "Up next" card, and a Daily review card. On load it scrolls to "You are here". Newly unlocked stops animate (`BB.path.pendingUnlock`).
- `BB.path.STAGES` lists every section in path order (stages + final reviews + checkpoints). `BB.path.stageLabel(st)` gives "Stage N" / "Checkpoint 1" etc. The Progress page uses both.
- The **fr2-flash** stop's `title`/`desc` are getters that follow the "what each book teaches" setting.
- **Saved progress and new stops:** inserting a stop mid-path locks everything after it until it's cleared. Earned stars are kept. This is accepted behavior.

---

## Activities (the engine)

`BB.def(id, { title, icon, kind, desc, setup:[fields], fromSetup(values) → opts, fix, run(body, opts, api) })`

`BB.run(id, opts, ctx)` renders the full-screen shell (✕ quit with confirm, title, meta/timer area, progress bar) and calls `run`. The **api** gives you: `body`, `opts`, `ctx`, `strict`, `progress(f)`, `meta(html)`, `record(n, ok, hinted)`, `interval/timeout` (auto-cleaned), `onCleanup(fn)`, `elapsed()`, and `finish(result)`.

`result = { correct, total, hinted, missed:[book n], timeMs?, pct?, score?, scoreLabel?, unit?, details?, failed?, failText?, fixed? }`

`ctx.mode` is `'path' | 'practice' | 'daily'`. In path mode the result screen saves stars, unlocks the next stop, and offers "Next: …". In practice mode it offers "Play again" / "Change settings". `ctx.bestKey` defaults to `<act>:<poolKey>`; path stops use `stop:<id>`.

**Activities:** `lesson`, `flash`, `fade`, `test`, `quiz`, `daily`, `order`, `speed`, `missing`, `match`, `sort`, `first`, `hood`, `survival`, `odd`, `mystery`, `shelf`, `unscramble`, `boss`, and `seq` (hidden; runs `opts.parts` in sequence with a "Part i of n" intro, adds up results, and stops early if a part `failed`).

**Setup form field types** (pages.js): `pool` (book range select; `custom: true` adds "Custom range…" with From/To boxes → `range:a-b`), `sections` (colored checkboxes), `seg` (segmented radio), `multi` (checkboxes), `toggle`, `stage`, `section`, `start` (survival start). Last-used values are saved in `store.data.setup[actId]`. Options in `BB.SUMMARY_OPTIONS` are hidden when the summaries setting is off.

**Pools** (`BB.pools.resolve(key)`): `all`, `ot`, `nt`, `learned` (books up to the last completed path lesson), `sec:<id>`, `stage:<id>`, `range:a-b`. Every pool is a contiguous range.

### Question engine (quiz.js)

- Types, keyed on the book to recall: `after` ("What comes after X?"), `before`, `number` ("Which book is #N?"), `numberOf` ("What number is X?"), `section` (always multiple choice), `teaches` (shows the summary with the book's own name and aliases blanked out by `BB.redact`).
- Target books are weighted by weakness (`store.weight`). Multiple-choice distractors are nearby books.
- `BB.quiz.play` options: `lives`, `perSec` (per-question timer), `timeLimit` (whole quiz; Daily = 300 s), `boss` (HP bar), `hints` (`false` hides the 💡 button), `noRecord`, `fixPhase`, `strict`, `redo` (default true).

### Fixing mistakes (owner request — important)

Anything you can get wrong must be fixed before finishing, **except the Test Simulation, which is one shot.**

- **Quizzes** (Mini Quiz, Daily Review, lesson quick check, reviews, boss rapid fire, Retry missed): a missed question is queued again at the end and keeps coming back until it's right ("🔁 Fix your mistakes · N left" → "✓ Correct after N tries"). Retries cost no lives, have no per-question timer, and are **not recorded in stats**. If Daily's 5 minutes run out, it stops asking new questions but still has you fix the misses.
- **Recite sheets** (`BB.Sheet` + `BB.fixLoop`): used by lesson rounds, the cumulative recite, the lesson recap retry, Fading List rounds and the boss recite. After grading, the right answers show in red; "Fix mistakes →" clears those rows to retype from memory, repeating until all are right. Fixed rows turn amber ("✓ fixed on try 2").
- **Games:** before the results, `BB.fixMistakes` runs a "Fix your mistakes" round with one typed question per missed book, using the game's `def.fix` types: order/missing/first/hood → after/before; survival → after; speed/shelf → number; sort/odd → section; match → section/numberOf/teaches by mode; mystery → teaches; unscramble → number/teaches with **strict spelling**. Flashcards already re-queue "still learning" cards, so they have no fix round.
- **Test Simulation, Old Testament Final, New Testament Final, Grand Finale:** **one shot**. Submit, get graded, see the results. The timer stops at submit.
- **Scores, stars and stats use the first attempt only.** The results screen shows "🔁 Fixed N mistakes", and the answer list marks "fixed on try N".

### Answer matching (`BB.match` in core.js)

- `norm()` lowercases, strips accents and punctuation, and drops filler words (the, book, of, gospel, according, to, saint, st, letter, epistle, prophet, apostle, paul, …). It maps ordinals (first/1st/i/one → 1, second/2nd/ii → 2, third/3rd/iii → 3, iv → 4), splits "1samuel" → "1 samuel", and moves a trailing number to the front ("Samuel 1" → "1 samuel").
- `identify(input)` is an exact alias lookup, then fuzzy matching (optimal string alignment). The number prefix must match. Allowed distance: 1 for ≤4 letters, 2 for ≤7, 3 for longer. If the best match is a tie between books, the answer is rejected.
- Aliases cover abbreviations, Douay names (Josue, Paralipomenon, Tobias, Canticle of Canticles, Ecclesiasticus, Isaias, Osee, Abdias, Apocalypse, 3/4 Kings, 1/2 Esdras, …), "Song of Solomon", "Qoheleth", "Revelations", etc. Ambiguous abbreviations like "jud" or "jo" are deliberately not aliases, and the alias table refuses duplicates (a console warning if one appears).
- `strictIdentify` is a case-insensitive exact name match only (plus "Acts").
- `exact(input)` decides Speed Recall's auto-accept while you type. It **won't** accept while a longer name could still follow ("phil" → Philemon). Speed Recall also accepts an exact name after a 650 ms pause (e.g. "Revelation" vs "Revelations").
- `hint(n)` returns the first letter (with the number for numbered books: "1 S…").
- Run `npm run test:match` after touching any of this.

### Storage (`BB.store`, localStorage key `seventy-three:v1`)

```
{ v:1,
  stops:{ [stopId]: {stars, best (pct 0–1), plays} },
  books:{ [n]: {r (right unaided), w (wrong), h (right with hint), box (0–5 Leitner), last (ms)} },
  mnemonics:{ 'stage:<id>' | 'sec:<id>' | 'all': text },
  flash:{ [n]: 'got' | 'learning' },
  best:{ [key]: {pct, timeMs, score, total, label, sub, date, plays} },
  setup:{ [actId]: last form values },
  daily:{ streak, bestStreak, last:'YYYY-MM-DD', days:[...] },
  settings:{ strict, sound, haptics, theme:'auto'|'light'|'dark', summaries },
  stats:{ answers, correct, hinted, since },
  seenWelcome }
```

`record(n, ok, hinted)`: unaided right → box+1; hinted right → box unchanged; wrong → box−2. Mastery = box/5. `weight(n)` rises with low box, error rate and staleness, and drives "weakest first" everywhere. The Progress page can export/import this as JSON and reset it. **Any new field needs a default in `DEFAULTS()`**: `load()` merges defaults into saved data, so older saves keep working.

---

## Settings (⚙️ modal, `BB.openSettings`)

1. **Strict spelling by default.**
2. **Questions about what each book teaches** (`summaries`, on by default). Off removes `teaches` questions everywhere (falling back to other types), the summary flashcard modes, and summary matching (Memory Match pairs numbers instead). It also renames fr2-flash to "Section Cards" and hides summary options in setup forms. **Summaries still display** in lessons, the book list and the timeline; they're just not tested. Check `BB.askSummaries()`.
3. Sound effects, 4. Vibration, 5. Theme (Auto/Light/Dark).

---

## UI behavior the owner asked for (keep these)

- **Welcome popup** on first visit (`BB.showWelcome`, `locked: true` modal): no ✕, no Escape, no backdrop click, and it survives navigation (the router leaves `.modal-back.locked` alone). Only **Continue** closes it. It shows again after a progress reset.
- **All popups freeze the page behind them** (`BB.ui.scrollLock` uses `position: fixed` on body so iOS respects it, then restores the scroll position).
- **Timeline line** stops at era 11 (each era's `::before` connects to the next; the last has none).
- **Hints** are off in every boss and in the Old Testament, New Testament and Grand Finale finals (see "No hints" above).
- **Lesson first-letters round** reports "Perfect!" / "x of y correct" with **no "with hints"**, and its answers count as **unaided** in stats. Only the 💡 button counts as a hint, everywhere.
- **Daily review** shows its focus books on a start screen only, never during the questions (that would give away answers).
- **Locked path stops** shake only their icon. `BB.fx.shake`/`pop` use `composite: 'add'` so they don't wipe out an element's positioning transform.
- **Enter-key shortcuts** (Next/Continue) ignore keypresses from enabled text inputs, so pressing Enter in a field never triggers them.
- **Book-info tags** (section/testament/abbr/DC) are vertically centered pills.
- **Test Simulation** "Sheet" offers all/OT/NT/learned/sections/path chunks plus **Custom range…** (From/To 1–73, validated, remembered).
- Lessons: book cards with summaries, ready-made + personal mnemonic, timeline modal, then fading list → **first letters only** → blank page → quick check → cumulative "chain it on" recite (previous chunk + this one) → recap with retry.

### Design system

- Fonts: **Fraunces** (headings, serif) + **Nunito** (body) from Google Fonts, with system fallbacks. Tokens are on `:root`: `--bg --surface --text --muted --line --accent --gold --good --bad`, etc. Dark mode comes from `prefers-color-scheme` unless `data-theme` is set on `<html>`.
- Mobile first. The phone tab bar (Path, Practice, Daily, Books, Progress) hides at ≥900px, where the top nav appears. Activities hide the tab bar (`body.in-activity`).
- Feedback: WebAudio sounds (`good`, `bad`, `tap`, `star`, `unlock`, `win`, `flip`), vibration, confetti on 3 stars or an unlock, a spark burst on correct answers, stars revealed one at a time.
- **Favicon:** `icon.svg` matches the header `.logo` (a conic sweep of the 9 light-mode section colors from 200°, inset rim, and "73" in Fraunces 700 converted to outlines, since favicons can't load web fonts). To regenerate:
  ```sh
  pip install fonttools
  mkdir -p fontdl && curl -sS -A "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0 Safari/537.36" \
    "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@16,700&text=73" | grep -o 'https://[^)]*' | head -1 | xargs curl -sS -o fontdl/f73
  python3 tests/tools/make-icon.py icon.svg fontdl/f73 && rm -rf fontdl
  ```

---

## Routes (`BB.router`, hash-based)

`#/` path · `#/stop/<stopId>` run a path stop · `#/practice` hub · `#/practice/<actId>` setup form (Start runs it) · `#/daily` · `#/books` · `#/timeline` (`?book=N` or `?stage=id` highlights) · `#/mnemonics` · `#/progress`.

Activities render into `#view` **without changing the hash**, so Back returns to the page you came from, and refreshing a setup page shows the form again.

---

## Testing notes and gotchas

- `tests/solver.js` defines `window.__step()`, which looks at the screen and does the next correct action for every activity. It also clicks Replay if a stop fails. `window.__wrongEvery = k` makes it miss every k-th first attempt. **When you add an activity or change its DOM, update the solver**, or `test:path` will report STUCK.
- Test scripts set `seenWelcome = true` and **reload**. Otherwise the locked welcome popup (correctly) blocks every click.
- Google Fonts requests are blocked in tests to keep them offline. The resulting "Failed to load resource" console noise is ignored on purpose.
- Mystery Book can score 1–2 stars in `test:path` because the solver binary-searches (more guesses means fewer stars). That isn't a bug.
- `quiz.play` exposes the current question as `wrapEl._q` (and the shuffled options as `_opts`) for the solver. It isn't shown to users.
- Book numbers are 1-based everywhere (`BB.book(n)` reads `BOOKS[n-1]`).

---

## Working conventions

- Match the surrounding code: 2-space indent, single quotes, compact functions, comments only where intent isn't obvious.
- Keep the README feature list in sync with user-visible changes.
- Commit messages: a short imperative subject plus a body listing the user-visible changes.
- Verify UI changes in a real browser (Playwright screenshots at 390×844 and 1280×860, light and dark) before calling them done.
- The owner tends to send follow-up tweaks mid-task. Finish the current change, commit it, then do the next.

## Ideas not done yet (only if asked)

- Optional: make the boss "recite it all" step one shot too (currently it has the fix loop by design).
- A "test out" option to skip path stages you already know.
- Per-stage review stops before Stage 9 / Stage 14 (currently the checkpoints play that role).
