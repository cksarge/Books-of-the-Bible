# Seventy-Three

A website for memorizing the **73 books of the Catholic Bible** in order: which section each one belongs to and roughly what each one teaches.

It's plain HTML, CSS, and JavaScript, with no build step, no dependencies, and no login. Progress is saved in your browser's `localStorage` on your device.

## Run it

- **Quickest:** open `index.html` in a browser.
- **Local server** (lets it install as an app and work offline):
  ```sh
  npx serve .        # or: python3 -m http.server
  ```
- **GitHub Pages:** in the repo, go to *Settings → Pages*, set *Source* to "Deploy from a branch", and pick the branch and `/ (root)`.

## What's inside

**The Path (home screen).** A winding map with 108 stops from Genesis to Revelation. Each section has its own trail shape.

- 13 stages, one per section. Long sections are split into chunks of 4–8 books (for example, Historical Books is split into three stages and Prophets into three).
- Each stage has these stops: Lesson → Flashcards → Mini Quiz → two games → a **Section Boss Round**.
- Review stops between stages mix in books from earlier stages, weighted toward the ones you miss.
- **Checkpoint 1** (after the Prophets) is the **Old Testament Final**, books 1–46. **Checkpoint 2** (after Stage 13) is the **New Testament Final**, books 47–73. Both use the one-shot test simulation.
- **Final Review 1 and Final Review 2** (Stages 14 and 15) cover all 73 books with different mixes of games and tools, and each ends with its own boss.
- The **Final Checkpoint** is the **Grand Finale**: write all 73 from memory.
- Each stop earns up to 3 stars (50% / 70% / 90% accuracy). Finishing a stop unlocks the next one, and you can replay any stop.

**Learn mode (lessons).** A lesson walks you through:

1. The chunk's books with their section colors and summaries.
2. A ready-made mnemonic, plus your own if you've written one.
3. A fading list, then a first-letters-only round, then a blank page.
4. A quick check.
5. A cumulative "chain it on" recite (the previous chunk plus this one).
6. A link to the timeline.
7. A recap of what you missed, with one-tap retry.

**Study tools:**

- Reference list
- Flashcards (4 modes plus mixed, with shuffle, filters, and got it / still learning)
- Fading list
- Mnemonic builder
- Timeline
- Daily review (about 5 minutes, with a streak counter)
- Progress (mastery by section, most-missed books, best scores and times, backup export/import)

**Quizzes:**

- Mini quiz: choose the length, sections, question types, and multiple-choice or typed answers. The correct answers are shown at the end.
- Test simulation: a blank numbered sheet with a strict-spelling toggle and an optional timer.
- Every typed answer has a 💡 first-letter hint. Hinted answers are tracked separately and count half.

**Games:**

- Put in Order
- Speed Recall
- Missing Book
- Memory Match
- Sort It
- Which Comes First?
- Neighborhood
- Survival Streak
- Odd One Out
- Mystery Book
- Bookshelf
- Unscramble
- Section Boss Round

**Fixing mistakes.** Anything you get wrong comes back before you can finish:

- Missed quiz questions (Mini Quiz, Daily Review, lesson checks, reviews, boss rounds) return at the end until you answer them correctly ("Correct after 2 tries").
- On recite sheets (lessons, Fading List, boss rounds), you see the right answers, then retype the missed rows from memory until they're all right.
- The Test Simulation and the two finals are one shot: you submit once and get graded.
- Games end with a short "Fix your mistakes" round on each missed book.

Only your first attempt counts toward stars, scores, and stats.

**Answer checking.** Answers ignore capitalization. They also accept:

- Abbreviations
- Numbering styles: `1 Sam`, `First Samuel`, `I Samuel`, `1samuel`
- Traditional names: `Song of Solomon`, `Ecclesiasticus`, `Apocalypse`, `Qoheleth`, Douay names
- Small typos

Strict spelling turns all of that off. Books you miss come up more often everywhere.

**Settings (⚙️).**

- **Strict spelling** sets the default for typed answers.
- **Questions about what each book teaches** can be turned off if you only need names, order, and sections. That removes "Which book teaches…?" questions and the summary flashcard and matching modes everywhere. Summaries still show in lessons and the book list.
- Sound, vibration, and theme.

## Code map

| File | What it holds |
| --- | --- |
| `js/data.js` | The 73 books (number, name, abbreviation, testament, section, deuterocanonical flag, summary), sections, path stages and mnemonics, timeline eras |
| `js/core.js` | Utilities, answer matching, storage, sound, confetti, shared UI |
| `js/engine.js` | Activity runner, result and stars screen, recite sheet, multi-part sequences |
| `js/quiz.js` | Question generator, mini quiz, daily review |
| `js/study.js` | Lesson, flashcards, fading list, test simulation |
| `js/games.js` | The games |
| `js/path.js` | Path stops, boss and review builders, path map |
| `js/pages.js` | Practice hub, setup forms, reference, timeline, mnemonics, progress, settings |
| `js/app.js` | Router |
