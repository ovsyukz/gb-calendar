# Netlify deployment checklist

**Not needed yet.** Everything in this repo runs locally without it — see
"Local development" in the README. Work through this only when the refactor is
merged and you are ready to put the new site live.

Until then the live site keeps serving the old code from `main`, untouched.

---

## 1. Generate the session secret

- **`SESSION_SECRET`** — 32+ random bytes, used to sign admin session cookies:

  ```bash
  node -e "console.log(crypto.randomBytes(32).toString('hex'))"
  ```

  Changing this later signs every admin out immediately, which is the fastest
  way to revoke access if you ever need to.

## 2. Provision the database

1. Netlify dashboard → your site → **Extensions** → **Netlify DB** → install
2. Claim the database when prompted.
   ⚠️ Auto-provisioned databases expire if left unclaimed — do this in the same
   sitting, not "later".
3. Netlify injects `NETLIFY_DATABASE_URL` automatically. You do not set it.

## 3. Set the environment variables

Netlify → **Site configuration** → **Environment variables** → Add:

| Variable         | Value          | Scope        |
| ---------------- | -------------- | ------------ |
| `SESSION_SECRET` | from 1Password | All contexts |

The admin password is **not** an environment variable — accounts live in the
database. See step 5b.

Leave `NETLIFY_DATABASE_URL` alone — step 2 provides it.

## 4. Connect the repository

1. Netlify → **Add new site** → **Import an existing project** → **GitHub**
2. Authorize the Netlify GitHub App for `ovsyukz/gb-calendar`
3. Select the repo. `netlify.toml` is read automatically, so:
   - build command: **blank**
   - publish directory: **`public`**
   - functions directory: **`netlify/functions`**
4. Production branch: **`main`**
5. Deploy

## 5. Run the migration against production

Locally, with the production connection string from the Netlify dashboard:

```bash
NETLIFY_DATABASE_URL='postgres://…' npm run migrate
```

It prints `Using Netlify DB` rather than `Using local database`. If it says
local, the variable did not reach the script.

## 5b. Create the admin account

Nobody can log in until this exists — login fails closed on an empty table.

```bash
NETLIFY_DATABASE_URL='postgres://…' npm run admin:add
```

Choose a password that is **not** `GB2026`; that one is in the public repo's
history. Store it in 1Password. It is written as a one-way scrypt hash and
cannot be read back, so a forgotten password is reset by running this again.

## 6. Turn on sign-up emails

Netlify → **Forms** → `tournament-signup` → **Settings & usage** →
**Form notifications** → add an email notification for the coaches.

The form is detected at build time from `public/netlify-form-detect.html`. If
it does not appear in the dashboard, that file did not deploy.

## 7. Verify the live site

- [ ] Calendar renders, July–December 2026, arrows disabled at both ends
- [ ] IBJJF Chicago Open appears on **both** 8 and 9 August
- [ ] Sign up with an email → success message
- [ ] Sign up **without** an email → also succeeds
- [ ] Coaches receive the notification email
- [ ] **Admin login rejects the old `GB2026`**
- [ ] A wrong username and a wrong password give the same message
- [ ] Admin login accepts the new account, participant list shows the sign-ups
- [ ] Remove a participant, refresh — it stays gone
- [ ] Open in a private window: `/api/signups` returns 401, not data

That last one is the important one. It is the check that the password really
did move server-side.

## 8. Tidy up

- [ ] Delete the `add-ci-cd` branch — `netlify.toml` was recreated during the
      refactor, so it is redundant
- [ ] Delete the `refactoring` and `refactor/full-rewrite` branches once merged
- [ ] Confirm GitHub Actions is green on `main`

---

## Rollback

If the new site misbehaves: Netlify → **Deploys** → pick the last known-good
deploy → **Publish deploy**. That is instant and needs no git changes.

## Notes

- Sign-ups only exist in the database from the moment it goes live. There is
  nothing to migrate — the old sign-ups lived in each visitor's `localStorage`
  and were never readable by anyone else.
- The site stores names and email addresses, some belonging to minors given the
  kids divisions. Worth deciding who has the admin password, and having a way
  to delete an athlete on request.
