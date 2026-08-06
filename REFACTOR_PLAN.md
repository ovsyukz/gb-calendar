# GB Calendar — Refactor Plan

Ordered list of issues. Work top to bottom; each one is meant to be a single
small PR that leaves the site working.

## Functionality inventory

Extracted from `gbcal/export/index-src.html` — the readable source behind the
bundled `gbcal/index.html`. Everything marked **keep** must survive the rewrite.

| #   | Feature                                                        | Status                       |
| --- | -------------------------------------------------------------- | ---------------------------- |
| F1  | Month grid, Jul–Dec 2026, prev/next disabled at range ends     | keep                         |
| F2  | "Today" cell highlight (accent ring + filled number)           | keep                         |
| F3  | Event chips per day; multi-day events span every date in range | keep                         |
| F4  | Chip click opens the registration link                         | keep (simplified — see note) |
| F5  | ↗ icon on chips opens registration link in new tab             | keep                         |
| F6  | "Upcoming Tournaments" sidebar, date-sorted, with date badge   | keep                         |
| F7  | Multi-day badge labels, including cross-month (`30 Nov–2 Dec`) | keep                         |
| F8  | Multiple labelled links per tournament (Adults / Kids)         | keep                         |
| F9  | Sign-up form: validation, success/error messages               | keep, **+ optional email**   |
| F10 | Sign-up triggers an email notification                         | keep                         |
| F11 | Admin login modal, password gate, logout                       | keep                         |
| F12 | Admin sees participant list, can remove a sign-up              | keep — and _fixed_, see #9   |
| F13 | Admin-only "+ Add Tournament" button                           | **dropped** (decision D1)    |
| F14 | Add/Edit tournament modal                                      | **dropped** (decision D1)    |
| F15 | Delete tournament                                              | **dropped** (decision D1)    |
| F16 | Save disabled until name is non-empty                          | **dropped** with F14         |
| F17 | Configurable accent colour + toggleable sidebar                | keep, as CSS variables       |
| F18 | Sign-ups persist in a real database, shared across everyone    | **new** (decision D3)        |
| F19 | Athletes who give an email are linked across tournaments       | **new** (decision D4)        |

**Note on F4:** today a chip does one of two things depending on admin state —
edit the tournament, or open its link. With F14 gone there is only one
behaviour left, so the chip always opens the registration link.

---

## Phase 0

### 1. Scaffold the project

`package.json`, `.nvmrc`, `.editorconfig`, Prettier + ESLint config, and an
updated `netlify.toml` pointing at the new `public/` directory. No bundler for
the front end — native ES modules, so there is no build step to break and
nothing from `node_modules` ships to the browser.

---

## Phase 1 — Security

First, because Phase 2's admin endpoints depend on it.

### 2. Move the admin password server-side

`ADMIN_PASSWORD = 'GB2026'` currently sits in the JavaScript every visitor
downloads. Replace with `netlify/functions/admin-login.js`, comparing against
`process.env.ADMIN_PASSWORD` with a timing-safe compare and returning a signed
session token.
**Files:** `netlify/functions/admin-login.js` (~40), `netlify/functions/_lib/auth.js` (~45)

### 3. Make the admin session real

Today `adminAuthed` is a plain JS variable — anyone can flip it to `true` in
DevTools. Replace with an HMAC-signed, short-expiry token in an `HttpOnly`
cookie, verified by every privileged endpoint. The client-side flag then only
controls _what is drawn_, never _what is allowed_. This matters more now than
it did before: behind that gate sits a list of real names and email addresses.
**Files:** `netlify/functions/_lib/auth.js`, `public/js/lib/api.js` (~50)

### 4. Rotate the leaked password

New password → 1Password → `ADMIN_PASSWORD` env var in both Netlify and GitHub.
Per decision D2 we are not rewriting git history; rotating makes the old value
worthless.

---

## Phase 2 — Data

### 5. Tournaments constant — the one file the admin edits

The centrepiece of decision D1, so it gets more care than a data file normally
would: one exported array, one documented shape, worked examples for the
single-day / multi-day / multi-link cases, and a comment block explaining
exactly how to add an entry and what happens next. A `validate()` call at load
time logs a clear console error on a malformed entry, so a typo says what is
wrong instead of rendering a blank calendar.
**Files:** `public/js/data/tournaments.js` (~70), `public/js/data/validate.js` (~45)

### 6. Provision Netlify DB

Create the managed Neon Postgres instance, wire `NETLIFY_DATABASE_URL` into
Netlify (and a separate dev branch URL for local work), and add the serverless
Postgres client. Document the provisioning steps in the README as we go —
Netlify's auto-provisioned databases need to be claimed within a limited window
or they expire, which is an easy thing to get caught by.
**Files:** `netlify/functions/_lib/db.js` (~40)

### 7. Schema and migrations

Two tables, plus a plain-SQL migration runner (no ORM — the schema is small
enough that an ORM would be more to learn than it saves):

```
athletes   id, name, email (citext, NULLABLE, unique), created_at
signups    id, athlete_id → athletes, tournament_id, created_at
           unique (athlete_id, tournament_id)
```

`tournament_id` deliberately has no foreign key — tournaments live in
`tournaments.js`, not the database (decision D1).

`email` is nullable per decision D4. Postgres treats NULLs as distinct in a
unique index, so `UNIQUE (email)` allows any number of email-less athletes
while still preventing two records for the same address — no partial index
needed.
**Files:** `migrations/001_init.sql` (~30), `scripts/migrate.js` (~55)

### 8. Data access layer

Every query in one place, parameterised, never string-concatenated:
`findOrCreateAthlete`, `createSignup`, `listSignups`, `deleteSignup`. Components
and functions never write SQL themselves.

`findOrCreateAthlete` branches on whether an email was given: with one, it
upserts on email so the athlete is reused across tournaments; without one, it
inserts a fresh row every time, because there is nothing reliable to match on.
**Files:** `netlify/functions/_lib/signups-repo.js` (~80)

### 9. Sign-ups API

One function: `POST` (public, validates name + email, upserts athlete, inserts
sign-up), `GET` (admin-only, returns the joined list), `DELETE` (admin-only).
This is what finally makes F12 work — today sign-ups sit in `localStorage`, so
each visitor sees only their own and an admin on a different laptop sees an
empty list.
**Files:** `netlify/functions/signups.js` (~85)

### 10. Email notification on sign-up

Keep the existing Netlify Forms POST purely as the notification channel — it is
free, already wired up, and needs no email provider or API key. The database
write in #9 is the source of truth; the Forms POST is fire-and-forget on top.
Keeps `netlify-form-detect.html` in place, now with an `email` field.

---

## Phase 3 — UI rewrite

Each issue is independently shippable; the page keeps working after each.

### 11. HTML skeleton and design tokens

Semantic `index.html` with `<template>` elements for every repeated fragment
(day cell, event chip, upcoming card, participant row). All ~200 inline
`style="…"` attributes become classes. F17's accent colour becomes a CSS custom
property, so re-theming is a one-line change.
**Files:** `public/index.html` (~90), `public/styles/tokens.css` (~45), `public/styles/base.css` (~50)

### 12. Date utilities

Pure functions, no DOM, no state: `formatDate`, `parseDate`, `today`,
`buildMonthGrid`, `formatDayRange` (F7's cross-month logic lives here). Pure, so
it is trivially unit-testable — which is the point.
**Files:** `public/js/lib/dates.js` (~60)

### 13. Template and DOM helpers

One small module for cloning a `<template>`, filling its slots, and binding
events, so no component reimplements DOM plumbing.
**Files:** `public/js/lib/dom.js` (~55)

### 14. Minimal state store

Subscribe/dispatch store holding `{ monthIndex, signups, isAdmin, adminModalOpen }`.
Components subscribe and re-render themselves. Replaces the old framework's
`setState` without adopting a framework. Note `tournaments` is absent — it is a
constant now, not state.
**Files:** `public/js/state/store.js` (~50)

### 15. Calendar grid — F1, F2, F3

**Files:** `public/js/components/calendar-grid.js` (~85), `public/styles/calendar.css` (~85)

### 16. Event chip — F4, F5

**Files:** `public/js/components/event-chip.js` (~50)

### 17. Upcoming sidebar — F6, F7, F8

**Files:** `public/js/components/upcoming-list.js` (~70), `public/styles/cards.css` (~60)

### 18. Sign-up form — F9, F10, F19

Three fields in order: **name** (required), **email** (optional), **tournament**
(required). The email label says "optional" out loud, and carries the one-line
note about what it is used for. Format-checked only when non-empty, on both
sides — client-side for a fast message, server-side because client-side
validation is a convenience, not a control.
**Files:** `public/js/components/signup-form.js` (~85), `public/styles/forms.css` (~55)

### 19. Admin panel — F11, F12

Richer than before now that there is a real database behind it: each row shows
athlete name, email, tournament, and sign-up date, with remove.
**Files:** `public/js/components/admin-panel.js` (~90), `public/styles/modal.css` (~70)

### 20. Wire it together, delete the old code

`main.js` bootstraps the store and mounts components. Then remove `gbcal/` —
the vendored 1,768-line `support.js`, the 387 KB bundled `index.html`, and the
four duplicate copies under `export/`, `uploads/`, `scraps/`. Git history keeps
them if we ever want to look back.
**Files:** `public/js/main.js` (~45); deletes `gbcal/`

---

## Phase 4 — Quality

### 21. Accessibility pass

The current markup has clickable `<div>`s and `<span>`s throughout, no focus
management in modals, and no labels tied to inputs. Fix: real `<button>`s, grid
semantics on the calendar, focus trap + `Escape` in the modal, visible focus
rings.

### 22. Tests

Vitest unit tests for `dates.js`, `validate.js`, the auth helpers, and the
repo layer against a throwaway database — the places where a subtle bug is
silent and costly.

### 23. CI

GitHub Actions running lint + tests on every PR, so a broken PR is caught
before the Netlify deploy preview.

### 24. README for the maintainer

How to add a tournament, how to rotate the admin password, how to read
sign-ups (including the SQL to export a tournament roster as CSV), and how to
run a migration.

---

## Decisions (resolved)

**D1 — Tournaments live in a constant.** The admin edits
`public/js/data/tournaments.js` and pushes; Netlify redeploys in ~30 seconds.
This drops F13–F16 (in-browser add/edit/delete). Accepted trade-off: the admin
is comfortable with code, and one obvious file beats a CRUD UI backed by
storage that only half works. Issue #5 carries the burden of making that file
genuinely easy to edit.

**D2 — Rotate the password, do not rewrite git history.** `GB2026` stays in
past commits but unlocks nothing once rotated.

**D3 — Sign-ups go in Netlify DB (managed Neon Postgres).** Real SQL, real
queries, CSV export. The email notification stays on Netlify Forms.

**D4 — Name required, email optional, tournament required.** Email keys the
athlete record when given, so repeat sign-ups link to one person and there is a
way to make contact. When it is omitted the sign-up still works — it just
creates a standalone athlete row that cannot be linked or contacted, and two
competitors with the same name stay indistinguishable. Deliberate trade: a
lower barrier to signing up, in exchange for a partial roster.

One knock-on: the `unique (athlete_id, tournament_id)` guard against double
sign-ups only protects athletes who gave an email. Someone without one who
submits twice creates two rows. Low stakes, and the admin can remove the
duplicate — but worth knowing rather than discovering.

## Context worth recording

- **Netlify Functions do not run Python** (JavaScript, TypeScript, and Go
  only), so everything server-side here is JavaScript.
- **This now stores personal data.** Names and email addresses of athletes,
  some of whom may be minors, given the kids divisions in the tournament list.
  That raises the stakes on issue #3 in particular, and argues for: not logging
  email addresses, a plain-language line on the form saying what the email is
  used for, and a way to delete an athlete on request. Worth a deliberate
  decision rather than a default.

## On the 100-line rule

Good instinct, and every file above is budgeted under it. Two will sit close:
`tournaments.js` grows as tournaments are added (data, not logic — length there
is harmless), and the CSS. If a _logic_ file starts pushing 100 lines, that is
exactly the signal you meant it to be, and it gets split.
