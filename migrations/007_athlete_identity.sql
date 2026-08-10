-- An athlete is identified by name AND email, not by email alone.
--
-- Email alone merged different people. A parent signing up two children uses
-- one address for both, which is the ordinary case and not an edge one: the
-- second child overwrote the first child's name, and their sign-up was then
-- discarded by the UNIQUE (athlete_id, tournament_id) constraint as a
-- duplicate. One competitor turned up on the day instead of two.
--
-- A duplicate now means every field matched.
--
-- Every statement is idempotent, so re-running this migration is harmless.

DROP INDEX IF EXISTS athletes_email_key;

-- A row with no email leaves a NULL in the key, and Postgres treats those as
-- distinct in a unique index. That preserves the rule 001_init.sql set: with
-- no address there is nothing reliable to match on, so each sign-up stands
-- alone rather than being merged with a stranger of the same name.
CREATE UNIQUE INDEX IF NOT EXISTS athletes_name_email_key
  ON athletes (lower(name), lower(email));
