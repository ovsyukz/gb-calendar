-- Admin edits to the tournament list, layered over the seed list in
-- public/js/data/tournaments.js.
--
-- The constant stays the starting point and stays editable in git; anything
-- an admin changes in the browser lands here and wins at read time. A row
-- with deleted = true is a tombstone, which is how a seed entry gets removed
-- without editing the file.

CREATE TABLE IF NOT EXISTS tournament_overrides (
  -- Matches the `id` in tournaments.js for an edit, or is a new id for a
  -- tournament that only exists in the database.
  id         TEXT PRIMARY KEY,
  name       TEXT,
  location   TEXT,
  date       TEXT,
  end_date   TEXT,
  links      JSONB       NOT NULL DEFAULT '[]'::jsonb,
  deleted    BOOLEAN     NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
