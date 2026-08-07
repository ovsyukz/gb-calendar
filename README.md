# GB Calendar

Tournament calendar for the Gracie Barra Deerfield team, with a sign-up form so
coaches know who is competing. Static site plus a few serverless functions,
hosted on Netlify.

## Adding or changing a tournament

Edit **one file**: [`public/js/data/tournaments.js`](public/js/data/tournaments.js).

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

Then commit and push. Netlify redeploys in about 30 seconds.

If a tournament does not appear, open the page and press F12 — a bad entry
prints a message naming the tournament and the problem.

> `id` is how sign-ups are stored. Changing it on a tournament people have
> already signed up for orphans those sign-ups.

## Reading sign-ups

Click **Admin login** at the bottom of the page and sign in.
You will see everyone who has signed up, with their tournament and email, and
can remove entries.

Coaches also get an email on each sign-up, via Netlify Forms.

To export a roster as CSV, run this against the database from the Netlify
dashboard:

```sql
SELECT a.name, a.email, s.tournament_id, s.created_at
FROM signups s
JOIN athletes a ON a.id = s.athlete_id
ORDER BY s.tournament_id, s.created_at;
```

## Admin accounts

Admins live in the database, one row per person, so more than one coach can
have access and a password can change without a redeploy.

```bash
npm run admin:add     # create an account, or reset an existing password
```

It prompts rather than taking arguments, so the password stays out of your
shell history. Store it in 1Password.

Passwords are held as one-way **scrypt** hashes — they cannot be read back,
not by you and not by anyone who obtains the database. A forgotten password is
reset by running the command again, never recovered.

`SESSION_SECRET` still lives in the environment; it signs the login cookie.
Changing it signs every admin out immediately, which is the fastest way to
revoke access.

## Local development

Everything runs on your laptop with no accounts and nothing to install beyond
npm packages — no Netlify, no Postgres, no Docker.

```bash
nvm use                # Node 22
npm install
cp .env.example .env   # any values will do locally
npm run migrate        # creates the tables, and a local admin to log in with
npm run dev            # http://localhost:8888
```

The dev server serves `public/` and runs the same function handlers Netlify
runs in production. When `NETLIFY_DATABASE_URL` is unset it uses an embedded
Postgres stored in `.pgdata/` — real Postgres, same SQL, just a local copy of
the data. Delete that folder to start clean.

`npm test` runs the tests, `npm run lint` the linter, `npm run format`
Prettier. CI runs all three on every pull request.

Deploying to Netlify is a separate exercise — see
[NETLIFY_TODO.md](NETLIFY_TODO.md) when you are ready for it.

## How it fits together

```
public/                    static site, served as-is (no build step)
  index.html               page skeleton + <template> fragments
  styles/                  tokens.css holds every colour and font
  js/data/tournaments.js   ← the file you edit
  js/lib/                  dates, DOM helpers, API client
  js/components/           one file per piece of UI
netlify/functions/         serverless endpoints under /api/*
migrations/                database schema, applied by npm run migrate
```

The browser loads native ES modules directly — there is no bundler and no
build step, so what is in `public/` is exactly what ships.

Tournaments are a constant in the repo; sign-ups live in Netlify DB (managed
Postgres). Admin access is checked on the server on every request — the
password never reaches the browser.

See [REFACTOR_PLAN.md](REFACTOR_PLAN.md) for the design decisions behind this.
