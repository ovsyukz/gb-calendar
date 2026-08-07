# GB Calendar

Tournament calendar for the Gracie Barra Deerfield team, with a sign-up form so
coaches know who is competing. A static site plus a few serverless functions,
hosted on Netlify.

This file is for whoever **runs** the calendar. If you are changing the code,
read [AGENTS.md](AGENTS.md) instead.

---

## What competitors see

The calendar, a list of upcoming tournaments, and a sign-up form asking for
their name, an optional email, and which tournament they are entering.

Only tournaments that have not happened yet can be chosen. Recent ones appear
under **Past Tournaments** for a month, greyed out.

---

## What coaches see

Log in with **Admin login** at the bottom of the page. A toolbar appears:

| Button               | What it does                                             |
| -------------------- | -------------------------------------------------------- |
| **+ Add Tournament** | Add one, or click any tournament on the calendar to edit |
| **Sign-ups**         | Every entry, newest first — remove any                   |
| **Add an Athlete**   | Enter someone who signed up in person                    |
| **Athletes**         | One row per person, with every tournament they are in    |
| **Admins**           | Who has access, and add a colleague                      |
| **Log out**          | Ends the session                                         |

Sign-ups and Athletes can be sorted by name or by event.

You also get an email each time someone signs up, via Netlify Forms.

---

## Adding a tournament

Two ways, and they do the same thing:

**In the app** — the **+ Add Tournament** button, or click any tournament on
the calendar to change or delete it. Takes effect immediately.

**In the code** — edit
[`public/js/data/tournaments.js`](public/js/data/tournaments.js), then commit
and push. Netlify redeploys in about 30 seconds.

```js
{
  id: 'gi-mar',                    // short nickname, never change it later
  name: 'Grappling Industries',
  location: 'Chicago, IL',         // optional
  date: '2027-03-14',
  endDate: '2027-03-15',           // optional, for multi-day events
  links: [{ label: 'Register', url: 'https://…' }],
},
```

That file is the **starting list** shipped with the code. Anything changed in
the app is stored in the database and takes precedence.

If a tournament does not appear, open the page and press F12 — a bad entry
prints a message naming the tournament and the problem.

> `id` is how sign-ups are stored. Changing it on a tournament people have
> already signed up for orphans those sign-ups.

Adults and kids events are separate entries, so competitors can pick the right
one.

---

## Admin accounts

One row per person, so several coaches can have access and a password can
change without a redeploy.

**Day to day**, add colleagues from the **Admins** button: a name, an email,
and a temporary password. They sign in with it and must choose their own before
they can do anything — until they do, every request they make is refused.

**For the first account, or if everyone is locked out:**

```bash
npm run admin:add
```

It prompts rather than taking arguments, so the password stays out of your
shell history. Store it in 1Password.

Passwords are held as one-way **scrypt** hashes. They cannot be read back — not
by you, not by anyone who obtains the database. A forgotten password is reset
by running that command again, never recovered.

`SESSION_SECRET` lives in the Netlify environment and signs the login cookie.
Changing it signs every admin out immediately, which is the fastest way to
revoke access.

---

## Exporting a roster

Run this against the database from the Netlify dashboard:

```sql
SELECT a.name, a.email, s.tournament_id, s.created_at
FROM signups s
JOIN athletes a ON a.id = s.athlete_id
ORDER BY s.tournament_id, s.created_at;
```

---

## Running it on your own machine

Nothing external needed — no Netlify account, no Postgres, no Docker.

```bash
nvm use                # Node 22
npm install
cp .env.example .env   # any values will do locally
npm run migrate        # creates the tables and a local admin
npm run dev            # http://localhost:8888
```

Log in with `admin@local` / `localdev123`.

The local database is an embedded Postgres in `.pgdata/` — real Postgres, same
SQL, just a separate copy of the data. It is never the live one.

---

## More

- **[AGENTS.md](AGENTS.md)** — working on the code: layout, conventions, and
  the traps we have already fallen into
- **[NETLIFY_TODO.md](NETLIFY_TODO.md)** — deploying, with the commands that
  actually worked
- **[REFACTOR_PLAN.md](REFACTOR_PLAN.md)** — what was rebuilt and why the
  decisions came out as they did
