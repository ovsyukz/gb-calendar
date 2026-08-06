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

Click **Admin login** at the bottom of the page and enter the admin password.
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

## Rotating the admin password

1. Generate a new password and store it in 1Password.
2. Netlify → Site configuration → Environment variables → set `ADMIN_PASSWORD`.
3. Redeploy (or wait for the next push).

Do the same for `SESSION_SECRET` if you ever need to sign everyone out —
changing it invalidates every existing admin session immediately.

**Never put either value in the code.** They are read from the environment at
runtime, and the repository is public.

## Local development

```bash
nvm use                # Node 20
npm install
cp .env.example .env   # fill in from 1Password
npm run migrate        # create the database tables
npx netlify dev        # http://localhost:8888
```

`npm test` runs the unit tests, `npm run lint` the linter, `npm run format`
Prettier. CI runs all three on every pull request.

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
