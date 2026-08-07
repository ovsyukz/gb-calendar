# Working on GB Calendar

A tournament calendar for a Brazilian jiu-jitsu gym. Competitors sign up for
tournaments; coaches log in to see who is going.

This guide assumes you are new to the project. It is written for humans and
for AI coding assistants alike — both make the same mistakes here.

---

## Get it running

```bash
nvm use              # Node 22
npm install
cp .env.example .env # any values work locally
npm run migrate      # creates the tables and a local admin
npm run dev          # http://localhost:8888
```

Log in with `admin@local` / `localdev123`. Those come from `.env`; change them
there if you like.

Nothing external is needed — no Netlify account, no Postgres install, no
Docker. The database is an embedded Postgres (PGlite) in `.pgdata/`.

---

## The five rules

**1. Never edit anything in `public/index.html` or `public/styles.css`.**
They are generated from `src/` and your changes will be erased by the next
build. Both are gitignored and marked read-only in the VS Code settings.

**2. Never put a password, key, or connection string in the code.**
Read it from `process.env`. A pre-push hook scans for this and will refuse the
push. This project already leaked an admin password once — it is still in the
git history.

**3. Validate on the server, always.**
Browser checks are a convenience for the person typing. Anyone can call the
API directly, so the rule that actually matters lives in
`netlify/functions/_lib/`.

**4. Keep files under 100 lines.**
Not a lint rule, a smell detector. If a file is growing past it, it is usually
doing two jobs. Split it.

**5. Run `npm run verify` before you push.**
Build, lint, formatting, tests, secret scan, and `npm audit`. The pre-push
hook runs it for you; do not get in the habit of `--no-verify`.

---

## Where things live

```
src/                     everything you hand-edit for the page
  index.html             the shell — a list of <!-- include: … --> lines
  head.html              fonts and the stylesheet link
  sections/              header, calendar, sidebar, sign-up panel
  dialogs/               one file per modal
  templates/             row templates, cloned at runtime
  styles/                one stylesheet per concern
  styles.manifest        the order stylesheets are concatenated in

public/                  what the browser gets
  index.html             GENERATED — do not edit
  styles.css             GENERATED — do not edit
  js/data/tournaments.js the seed tournament list
  js/lib/                dates, DOM helpers, API client, pure logic
  js/components/         one file per piece of UI
  js/state/store.js      a small subscribe/dispatch store

netlify/functions/       API endpoints
  _lib/                  shared server code — auth, db, validation, queries

migrations/              database schema (plain SQL)
scripts/                 build, dev server, migrate, admin:add, checks
tests/                   vitest
```

There is **no bundler**. The browser loads the ES modules in `public/js/`
directly, so what ships is what is in the repo. The build step only stitches
HTML partials together and concatenates CSS.

---

## Common tasks

### Add or change a tournament

Edit `public/js/data/tournaments.js`. It is heavily commented and has worked
examples. Commit and push; Netlify redeploys in about 30 seconds.

That file is a **seed list**. Admins can also add tournaments from the browser,
and those are stored in the database and layered on top.

> Never change an existing tournament's `id`. Sign-ups are stored against it,
> and changing it orphans them.

### Add a dialog or a page section

1. Create the markup in `src/dialogs/` or `src/sections/`
2. Add `<!-- include: dialogs/your-file.html -->` to `src/index.html`
3. Create a component in `public/js/components/` and mount it in `main.js`

The dev server rebuilds on refresh, so no restart is needed.

### Add a stylesheet

1. Create it in `src/styles/`
2. Add its filename to `src/styles.manifest`

Order in that file **is** the cascade. `tokens.css` first, `base.css` second.

### Add an API endpoint

Create `netlify/functions/your-thing.js`:

```js
import { isAdmin, json, unauthorized } from './_lib/auth.js';

export const config = { path: '/api/your-thing' };

export default async function yourThing(request) {
  if (!isAdmin(request)) return unauthorized();
  return json({ ok: true });
}
```

Put SQL in a `_lib/*-repo.js` file, never in the handler.

### Change the database schema

Add a new numbered file in `migrations/` — never edit an applied one. Make it
idempotent (`CREATE TABLE IF NOT EXISTS`) so re-running is safe. Then
`npm run migrate`.

---

## How it fits together

**Data flow.** `main.js` paints from the seed tournament list immediately, then
fetches the merged list (seed + database overrides) and replaces it. Every
component reads `state.tournaments` and re-renders when the store notifies.

**Auth.** Admin accounts live in the `admins` table with scrypt-hashed
passwords. Logging in sets an HMAC-signed token in an HttpOnly cookie. The
client's `isAdmin` flag only decides _what is drawn_ — the server checks the
cookie on every privileged request.

**Endpoints.**

| Path                  | Who                           |
| --------------------- | ----------------------------- |
| `/api/tournaments`    | public GET, admin write       |
| `/api/signups`        | public POST, admin GET/DELETE |
| `/api/admin/login`    | public                        |
| `/api/admin/logout`   | public                        |
| `/api/admin/session`  | public                        |
| `/api/admin/password` | signed-in                     |
| `/api/admins`         | admin                         |

**Tables.** `athletes`, `signups`, `tournament_overrides`, `admins`.

---

## Conventions

- **Set text with `textContent`, never `innerHTML`.** Athlete names and
  tournament names are user input.
- **Pure logic goes in `public/js/lib/`** — no DOM, no state. That is what
  makes it testable, and those are the files worth testing.
- **Use real `<button>` and `<a>` elements**, not clickable `<div>`s. The old
  version was unreachable by keyboard.
- **Dialogs are `<dialog>`** — focus trapping and Escape come free.
- **Show and hide with the `hidden` attribute.** `base.css` makes `[hidden]`
  win over class-based `display` rules; without that a class silently defeats
  it.
- **Comments explain _why_.** The code already says what.

---

## Traps we have already fallen into

**`npm test 2>&1 | tail -3` hides failures.** Vitest prints timing last, so a
truncated tail can look green while a test is failing. Read the whole output.

**`NETLIFY_DATABASE_URL` is reserved by Netlify.** A value you set under that
name is silently discarded. Use `DATABASE_URL`.

**Redeploying production does not rebuild branches.** Push a commit to the
branch instead.

**`netlify db status` and `netlify database connect` report your _local_
database** unless you explicitly pick Production. They are not a check of what
production looks like — hit `/api/tournaments` on the deployed URL.

**A `display` rule beats `[hidden]`.** This once left admin buttons visible to
logged-out visitors. Fixed globally in `base.css`; don't undo it.

**Deleting an admin fails if they created another.** `admins.created_by`
references `admins.id`; clear it first. See `NETLIFY_TODO.md`.

---

## Before you push

```bash
npm run verify      # what the hook runs
npm run verify:ci   # stricter: clean clone, npm ci, the Netlify build
```

`verify:ci` catches the "works on my machine" class of bug — a file that was
never committed, or one gitignored by accident.

If a push from your editor fails with `npm: command not found`, that is the
hook: GUI git clients do not load your shell profile. Push from a terminal.

---

## Deploying

`NETLIFY_TODO.md` has the full walkthrough, written from a real setup, with the
traps marked.

---

## More reading

- `README.md` — for the person maintaining the calendar, not developing it
- `REFACTOR_PLAN.md` — what was rebuilt and **why the decisions came out as
  they did**. Read this before arguing with an existing choice.
