-- A free-text note from the coach, shown on the tournament's card.
--
-- Things like "gi only", "weigh-in the night before", or "we are carpooling
-- from the gym at 6am" — the details that otherwise live in a group chat and
-- get lost.

ALTER TABLE tournament_overrides ADD COLUMN IF NOT EXISTS notes TEXT;
