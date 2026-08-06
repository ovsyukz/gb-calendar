-- Athletes and their tournament sign-ups.
--
-- Every statement is idempotent, so re-running this migration is harmless.

-- citext gives case-insensitive email matching, so Sarah@x.com and
-- sarah@x.com are recognised as the same person.
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS athletes (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT        NOT NULL,
  -- Nullable by design: email is optional on the sign-up form. Postgres
  -- treats NULLs as distinct in a unique index, so any number of athletes
  -- may have no email, while a given address still maps to one record.
  email      CITEXT      UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS signups (
  id            BIGSERIAL PRIMARY KEY,
  athlete_id    BIGINT      NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  -- No foreign key: tournaments live in public/js/data/tournaments.js, not
  -- in this database. This is the `id` field from that file.
  tournament_id TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Makes a double sign-up a no-op rather than a duplicate row. Only
  -- protects athletes who gave an email, since those without one get a
  -- fresh athlete record each time and so never collide.
  UNIQUE (athlete_id, tournament_id)
);

CREATE INDEX IF NOT EXISTS signups_tournament_idx ON signups (tournament_id);
