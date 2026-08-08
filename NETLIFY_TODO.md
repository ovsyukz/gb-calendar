# Netlify deployment checklist

Every command below was run for real against a Netlify site on 2026-08-07, and
then run again end to end the same evening against the live site — which is
where most of the ⚠️ notes come from. The awkward bits are called out where
they bit us.

Run everything from the project folder — the one containing `package.json`.
Running Netlify commands from a parent folder silently does the wrong thing.

---

## 1. Generate the session secret

Signs the admin login cookie.

```bash
node -e "console.log(crypto.randomBytes(32).toString('hex'))"
```

Save the 64 characters in 1Password. You will paste it in step 4.

Changing it later signs every admin out immediately — the fastest way to
revoke access.

---

## 2. Link the project to the site

```bash
npx netlify link --name YOUR-SITE-NAME
```

⚠️ **`--name` only searches the account you are logged in as.** If the site
belongs to someone else's Netlify account — which it does here; the site lives
on the account that owns the repo, not on a personal one — this fails with
`No projects found named …`, which reads like the site does not exist.

```bash
npx netlify status          # says which account you are
npx netlify sites:list      # every site that account can see
npx netlify switch          # pick another account, or add one
```

`switch` keeps both accounts signed in, so you can move between them without
logging in again. Check which one you are on before believing any `netlify`
command: as the wrong account, `netlify env:list` cheerfully reports **no
environment variables at all** rather than an error, which looks exactly like
someone deleted them.

Check it worked:

```bash
cat .netlify/state.json     # should show a siteId
```

### Then check the base directory

Not part of any command — it is a setting on the site, and a wrong one fails
every build before the config is even parsed:

```
Failed during stage 'Reading and parsing configuration files':
Base directory does not exist: /opt/build/repo/SOMETHING
```

`package.json` is at the repo root here, so **Base directory must be empty.**
Netlify UI → **Site configuration** → **Build & deploy** → **Build settings**,
or:

```bash
npx netlify api updateSite --data '{"site_id":"YOUR-SITE-ID","body":{"build_settings":{"base":""}}}'
```

Worth checking even on a site that used to work — this one had it set to a
folder that has never existed, and every deploy on every branch had been
failing for two days.

---

## 3. Create the database

```bash
npx netlify db init
```

Answer the two prompts:

- **What is your preferred style?** → **Direct SQL**
  Not Drizzle. This project already has its own SQL migrations; Drizzle would
  add a second, competing migration system.
- **Create sample data?** → **n**

This adds `@netlify/database` to `package.json`. It does **not** create the
database yet.

> Older CLI versions also scaffolded `netlify/database/migrations`. CLI 27.x
> does not, and this project would not use it anyway — migrations live in
> `migrations/` and are applied by `npm run migrate`.

⚠️ **Sync the lockfile before committing, or CI fails on `npm ci`.**

`@netlify/database` depends on `waddler`, which declares
`@electric-sql/pglite ^0.2.17` as an _optional peer_. This project's
devDependency is `^0.5.4`, which does not satisfy it. npm 11 leaves the peer
uninstalled; npm 10 — the version bundled with the Node in `.nvmrc`, and the
one CI uses — installs it nested. The lockfile npm 11 writes is therefore
missing an entry `npm ci` insists on:

```
npm error `npm ci` can only install packages when your package.json and
npm error package-lock.json ... are in sync.
npm error Missing: @electric-sql/pglite@0.2.17 from lock file
```

`npm install` will not fix this if you are on npm 11 — it reports "up to
date". Regenerate with the npm that CI uses:

```bash
npx npm@10 install --package-lock-only
npx npm@10 ci --dry-run          # should resolve cleanly
```

`npm run verify` does **not** catch this, because it never runs `npm ci`.

Commit and push to actually provision the database — it is created during a
deploy, and only when this package is present in the deployed tree:

```bash
git add package.json package-lock.json
git commit -m "Add @netlify/database"
git push
```

Confirm:

```bash
npx netlify db status     # first line should be 🟢 enabled
```

---

## 4. Set the environment variables

### SESSION_SECRET

Netlify UI → **Site configuration** → **Environment variables** → **Add a
variable**:

- Key: `SESSION_SECRET`
- Value: the string from step 1
- Scopes: **All scopes**

> Ticking **Secret** forces you to pick specific scopes, which is a paid
> feature. On the free plan, leave Secret unticked.

### DATABASE_URL

⚠️ **`NETLIFY_DATABASE_URL` is reserved by the Netlify Database extension.**
Anything you set under that name is silently discarded — it will not appear in
`netlify env:list` and will not reach your functions. The app therefore also
accepts `DATABASE_URL`, which is the one to set by hand.

Get the connection string:

```bash
npx netlify database connect --json
```

Choose **Production** at the prompt. Copy the `NETLIFY_DATABASE_URL` value —
the long `postgresql://…` string.

> **If it prints `"context": "dev"` and a `localhost` URL**, it is handing you
> the local database. Reset the CLI state and try again:
>
> ```bash
> rm -rf .netlify
> npx netlify link --name YOUR-SITE-NAME
> npx netlify database connect --json
> ```

Set it:

```bash
npx netlify env:set DATABASE_URL "postgresql://…paste…"
```

Verify both are present:

```bash
npx netlify env:list --context production
```

You want two rows: `DATABASE_URL` and `SESSION_SECRET`.

---

## 5. Create the tables

Migrations are **not** applied automatically. Run them from your machine,
pointed at production:

```bash
DATABASE_URL="postgresql://…paste…" npm run migrate
```

Success looks like:

```
Using Netlify DB
applied 001_init.sql
applied 002_tournament_overrides.sql
applied 003_admins.sql
applied 004_admin_profiles.sql
applied 005_disable_admins.sql
applied 006_tournament_notes.sql
Done — 6 migration(s) applied.
```

One line per file in `migrations/` — there are six as of 2026-08-07, and the
count grows as migrations are added. Don't treat the number as fixed.

⚠️ **If the first line says `Using local database (.pgdata/)`**, stop. The
connection string did not reach the script and it is building tables in a
local folder. Check the quotes and that it is all one line.

There should be no "Seeded a local admin" line — that only happens for the
local database.

### If the database already has tables

A database that was set up by hand — SQL pasted into the Neon console, or
`netlify database connect --query` — has no `schema_migrations` ledger, so the
runner tries to replay migrations whose effects are already present. That
fails where a later migration has since changed the schema:

```
NeonDbError: column "username" does not exist
```

`003` creates `admins.username`; `004` drops it. On a database already at
`004`, `003`'s `CREATE TABLE IF NOT EXISTS` is a no-op and its index then
references a column that is gone.

Do **not** edit the old migration — it is correct in sequence on a fresh
database. Record the ones already applied and let the runner continue:

```sql
INSERT INTO schema_migrations (name)
VALUES ('003_admins.sql'), ('004_admin_profiles.sql')
ON CONFLICT (name) DO NOTHING;
```

Check first that their effects really are present — for those two, that
`admins` has `password_hash`, `name`, `email`, `must_change_password`,
`created_by`, no `username`, and an `admins_email_key` index.

---

## 6. Create the first admin

There is **no default account.** On an empty database, nothing can log in
until you make one.

> Check before assuming the database is empty — this one was not. If the
> database predates you, it may already have admins:
>
> ```sql
> SELECT id, name, email, disabled_at FROM admins ORDER BY id;
> ```
>
> Running the command below with an email that already exists **resets that
> account's password** rather than creating a second one. That is the way out
> of being locked out, and it is not reversible — the old hash is gone.

```bash
DATABASE_URL="postgresql://…paste…" npm run admin:add
```

It prompts for name, email, and password (12 characters minimum). Store them
in 1Password. Run it in a real terminal — piping input to it does not work,
because readline swallows the whole buffer on the first question.

The password is written as a one-way scrypt hash and cannot be read back. To
change it, run the same command again with the same email.

After this, admins add each other from the **Admins** button in the app.

---

## 7. Redeploy and verify

Environment variables only apply to **new** builds.

⚠️ **Redeploying production does not rebuild your branches.** If you are
testing on a branch, push a commit to that branch:

```bash
git commit --allow-empty -m "Rebuild with DATABASE_URL"
git push
```

For production: **Deploys** → **Trigger deploy** → **Clear cache and deploy
site**.

Then check the API directly:

```
https://YOUR-SITE.netlify.app/api/tournaments
```

- **A JSON list of tournaments** → working.
- **`No database configured: set DATABASE_URL in the Netlify site environment
variables.`** → no connection string reached the function. The variable is
  missing, misnamed, or — most often — that deploy predates it. Environment
  variables only reach a **new** build, so redeploy before assuming the value
  is wrong.

> Older deploys return `EROFS: read-only file system, mkdir '/var/task/.pgdata'`
> instead. Same cause: the function fell back to the embedded local database,
> which cannot write on Netlify. The guard that turns this into the sentence
> above tested `NETLIFY`, which is set during builds but not in the functions
> runtime, so it never fired where it was needed. Fixed 2026-08-07.

Then in the browser:

- [ ] Calendar renders
- [ ] Sign up with an email → success message
- [ ] Sign up **without** an email → also succeeds
- [ ] **Admin login rejects the old `GB2026`**
- [ ] A wrong email and a wrong password give the same message
- [ ] Admin login accepts your new account
- [ ] Remove a participant, refresh — it stays gone
- [ ] Private window: `/api/signups` returns 401, not data

That last one is the important one — it proves the password really did move
server-side.

> The sign-up checks need a **logged-out** browser: an admin sees the admin
> toolbar in place of the sign-up panel, so there is no form to fill in. Use a
> private window rather than logging out, so you keep your session.
>
> Removing a sign-up does not delete the athlete. An athlete with no sign-ups
> stays in `athletes` and shows nowhere in the app, so test entries linger
> until deleted in SQL.

---

## Housekeeping

### Turn on sign-up emails

Netlify → **Forms** → `tournament-signup` → **Settings & usage** → **Form
notifications** → add an email notification.

The form is detected at build time from `public/netlify-form-detect.html`.

### Delete an admin

`admins.created_by` references `admins.id`, so an account that created another
cannot be deleted until that reference is cleared:

```bash
DATABASE_URL="postgresql://…paste…" node -e "
import('./netlify/functions/_lib/db.js').then(async ({ sql }) => {
  await sql()\`UPDATE admins SET created_by = NULL WHERE created_by = (SELECT id FROM admins WHERE email = 'THE_EMAIL')\`;
  await sql()\`DELETE FROM admins WHERE email = 'THE_EMAIL'\`;
  console.log(await sql()\`SELECT email FROM admins\`);
  process.exit(0);
});"
```

### Rotate the database password

If the connection string is ever exposed — pasted into a chat, committed,
posted in a ticket — reset it in the Neon console under **Roles**, then update
`DATABASE_URL` in Netlify and redeploy.

### Rollback

**Deploys** → pick the last known-good deploy → **Publish deploy**. Instant,
no git changes.

---

## Notes

- Netlify creates a **separate database branch per git branch**. A branch
  deploy talks to its own copy, so data added on a branch is not in
  production.
- `npx netlify db status` and `npx netlify database connect` report your
  **local** database unless you explicitly pick Production. They are not a
  reliable check of what production looks like — use the `/api/tournaments`
  URL instead.
- `netlify/database/migrations` exists because `db init` created it. This
  project does not use it; migrations live in `migrations/` and are applied by
  `npm run migrate`.
- Sign-ups only exist from the moment the database goes live. There is nothing
  to migrate — the old ones lived in each visitor's browser.
- The site stores names and email addresses, some belonging to minors given
  the kids divisions. Worth deciding who holds an admin account, and having a
  way to delete an athlete on request.
