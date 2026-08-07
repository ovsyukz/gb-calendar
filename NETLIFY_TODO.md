# Netlify deployment checklist

Every command below was run for real against a Netlify site on 2026-08-07. The
awkward bits are called out where they bit us.

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

Check it worked:

```bash
cat .netlify/state.json     # should show a siteId
```

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

This installs `@netlify/database` and scaffolds `netlify/database/migrations`.
It does **not** create the database yet.

Commit and push to actually provision it — the database is created during a
deploy:

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
Netlify DB
applied 001_init.sql
applied 002_tournament_overrides.sql
applied 003_admins.sql
applied 004_admin_profiles.sql
Done — 4 migration(s) applied.
```

⚠️ **If the first line says `Using local database (.pgdata/)`**, stop. The
connection string did not reach the script and it is building tables in a
local folder. Check the quotes and that it is all one line.

There should be no "Seeded a local admin" line — that only happens for the
local database.

---

## 6. Create the first admin

There is **no default account.** Nothing can log in until you make one.

```bash
DATABASE_URL="postgresql://…paste…" npm run admin:add
```

It prompts for name, email, and password (12 characters minimum). Store them
in 1Password.

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
- **`EROFS: read-only file system, mkdir '/var/task/.pgdata'`** → no
  connection string reached the function. The variable is missing, misnamed,
  or that deploy predates it.

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
