# GB Calendar — Refactor

This began as a forward-looking issue list. The rewrite is now built, so it is
a record of what was delivered, why the decisions came out the way they did,
and what is left.

---

## What the old app was

One 387 KB bundled `index.html` on a vendored 1,768-line proprietary framework
(`x-dc` / `DCLogic` in `support.js`), plus four duplicate copies of itself. The
admin password was hardcoded in the JavaScript every visitor downloaded, and
sign-ups lived in each visitor's `localStorage` — so the participant list only
ever showed your own entries.

---

## Feature inventory

Every behaviour of the old app, and what happened to it.

| #   | Feature                                                      | Outcome                          |
| --- | ------------------------------------------------------------ | -------------------------------- |
| F1  | Month grid, Jul–Dec 2026, prev/next disabled at range ends   | kept, opens on the current month |
| F2  | "Today" cell highlight                                       | kept                             |
| F3  | Event chips per day; multi-day events span their whole range | kept                             |
| F4  | Chip click opens the registration link                       | kept; edits it when admin        |
| F5  | ↗ icon opens registration in a new tab                       | kept                             |
| F6  | "Upcoming Tournaments" sidebar                               | kept, **upcoming only**          |
| F7  | Multi-day badge labels, incl. cross-month (`30 Nov–2 Dec`)   | kept                             |
| F8  | Multiple labelled links per tournament                       | kept                             |
| F9  | Sign-up form with validation                                 | kept, **+ optional email**       |
| F10 | Sign-up triggers an email notification                       | kept (Netlify Forms)             |
| F11 | Admin login, logout                                          | kept, rebuilt server-side        |
| F12 | Admin sees participants, can remove one                      | kept — and **fixed**             |
| F13 | Admin-only "+ Add Tournament"                                | dropped, then **restored** (D1)  |
| F14 | Add/Edit tournament modal                                    | dropped, then **restored** (D1)  |
| F15 | Delete tournament                                            | dropped, then **restored** (D1)  |
| F16 | Save disabled until name is non-empty                        | restored with F14                |
| F17 | Configurable accent colour                                   | kept, as CSS custom properties   |

Added during the rewrite:

| #   | Feature                                                          |
| --- | ---------------------------------------------------------------- |
| F18 | Sign-ups persist in Postgres, shared across everyone             |
| F19 | Athletes who give an email are linked across tournaments         |
| F20 | Admin accounts in the database, passwords hashed with scrypt     |
| F21 | Any admin can add another; new admin must replace their password |
| F22 | Athletes view — one row per person, not per sign-up              |
| F23 | Admin can enter someone who signed up in person                  |
| F24 | Sort the Sign-ups and Athletes lists by name, event, or count    |
| F25 | "Past Tournaments" — the last month only, greyed and inert       |
| F26 | Subtitle names the next tournament instead of a hardcoded season |
| F27 | Official Gracie Barra shield in the header                       |

---

## Decisions

**D1 — Tournaments: constant, then constant plus database.**
Originally the tournament list was to be a hand-edited constant, dropping the
in-browser add/edit/delete UI. That was reversed: `public/js/data/tournaments.js`
is now a **seed list**, and admin edits are stored in a `tournament_overrides`
table that wins at read time. Deleting a seed entry writes a tombstone, since a
browser cannot edit a file in the repo. The file stays meaningful and editable
in git; the database stays authoritative.

**D2 — Rotate the leaked password, do not rewrite git history.**
`GB2026` remains in old commits but unlocks nothing.

**D3 — Sign-ups live in Netlify DB (managed Neon Postgres).**
Netlify Forms stays, purely as the email notification.

**D4 — Name required, email optional, tournament required.**
Email keys the athlete record when given, so repeat sign-ups link to one
person. Without it the sign-up still works but creates a standalone record that
cannot be linked or contacted. Knock-on: the `unique (athlete_id,
tournament_id)` guard against duplicates only protects athletes who gave an
email.

**D5 — Admin accounts in the database, not an environment variable.**
Replaces the single `ADMIN_PASSWORD`. Passwords are hashed with scrypt — one
way, never readable back. More than one coach can have access, and a password
changes without a redeploy.

**D6 — A new admin must replace their temporary password before doing anything.**
Enforced server-side: the session token carries a `pending` flag and every
privileged endpoint refuses it. Closing the dialog, reloading, or calling the
API directly all get 401.

**D7 — HTML and CSS are assembled from `src/` at build time.**
`index.html` had reached 456 lines holding seven dialogs and six templates.
Each piece now lives in its own file under `src/` and `scripts/build-html.js`
stitches them together; `scripts/build-css.js` concatenates sixteen stylesheets
into one. Both builders are deliberately dumb — includes and concatenation,
nothing else. There is still no bundler: the browser loads the ES modules in
the repo.

---

## How it is put together

```
src/                       everything you edit
  index.html               the shell: a list of includes
  head.html                fonts and the stylesheet
  sections/                header, calendar, sidebar, sign-up panel
  dialogs/                 one file per modal
  templates/               row templates cloned by lib/dom.js
  styles/                  one stylesheet per concern
  styles.manifest          the order they are concatenated in
public/                    what ships
  index.html               GENERATED — gitignored
  styles.css               GENERATED — gitignored
  js/data/tournaments.js   ← the seed tournament list
  js/lib/                  dates, DOM helpers, API client
  js/components/           one file per piece of UI
netlify/functions/         endpoints under /api/*
migrations/                schema, applied by npm run migrate
scripts/                   build, dev server, migrate, admin:add, checks
```

No logic file exceeds 100 lines. 152 tests. `npm run verify` runs build, lint,
formatting, tests, a secret scan, and `npm audit`; a pre-push hook runs it
before anything reaches GitHub, and CI runs the same suite.

---

## Still open

- **`REFACTOR_PLAN.md` and the code have diverged before.** If a decision
  changes again, change it here too.
- **PR #8 targets `main`, not `refactoring`.** The agreed flow was feature →
  `refactoring` → `main` only once proven.
- **Deploy previews were failing** on the original repo. A clean clone builds,
  bundles, and passes everything, so the cause is environmental — the deploy
  log will say in one line.
- **The Netlify walkthrough** is in `NETLIFY_TODO.md`, rewritten with the
  commands that actually worked, including that `NETLIFY_DATABASE_URL` is
  reserved and `DATABASE_URL` must be used instead.
- **Two tidy-ups:** delete the redundant `add-ci-cd` branch, and decide whether
  `netlify/database/migrations` (created by `netlify db init`, unused) should
  be removed.
- **Privacy.** The site stores names and email addresses, some belonging to
  minors given the kids divisions. Worth deciding who holds an admin account,
  and having a way to delete an athlete on request.
