# CLAUDE.md

**Read [AGENTS.md](AGENTS.md) first.** It is the guide to this project — how to
run it, where things live, the conventions, and the traps. Everything in it
applies to you.

Kept as a pointer rather than a copy: two files saying the same thing drift
apart, and this repo has been bitten by exactly that before.

---

## Notes specific to working here with Claude Code

**Never edit `public/index.html` or `public/styles.css`.** They are generated
from `src/`. Editing them looks like it worked and is silently undone by the
next build. Change the partial in `src/` instead.

**Read check output in full.** Do not pipe `npm test`, `npm run lint`, or
`npm run format` through `tail`. Vitest prints timing lines last and Prettier
prints errors above the summary, so a truncated view can look green while
something is failing. Run `npm run verify` and read it.

**Never delete `.pgdata/`.** It is the local database and holds real work the
person you are helping has entered by hand. "It's only test data" is an
assumption, not a fact. Clean up the specific rows a test created, or ask.
`make reset-db` exists for when _they_ want a clean database.

**Verify against a clean clone before claiming something is deployable.**
`npm run verify:ci` clones HEAD into a temp directory and runs `npm ci` and the
Netlify build there. A green `npm run verify` can still fail to deploy if a
needed file was never committed.

**Check the rendered page, not just the tests.** Two real bugs in this codebase
were invisible to tests and linting: a `<dialog>` that was pinned to the corner
because a CSS reset killed `margin: auto`, and admin controls visible to
logged-out visitors because a class-based `display` rule outranked `[hidden]`.
Both took ten seconds to spot in a browser.

**Do not commit or push unless asked.** The maintainer merges deliberately, and
the branching flow is intentional.

---

## Fast orientation

```bash
npm run dev        # http://localhost:8888, log in as admin@local / localdev123
npm run verify     # build, lint, format, tests, secrets, audit
```

| I want to change…        | Edit…                                 |
| ------------------------ | ------------------------------------- |
| a tournament             | `public/js/data/tournaments.js`       |
| page markup              | `src/sections/`, `src/dialogs/`       |
| styling                  | `src/styles/` + `src/styles.manifest` |
| UI behaviour             | `public/js/components/`               |
| pure logic worth testing | `public/js/lib/`                      |
| an API endpoint          | `netlify/functions/`                  |
| SQL                      | `netlify/functions/_lib/*-repo.js`    |
| the schema               | a **new** file in `migrations/`       |
