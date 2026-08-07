-- Removing an admin disables the account rather than deleting the row.
--
-- The record is worth keeping: signups and other admins reference it through
-- created_by, and knowing who added whom is part of the audit trail. A DELETE
-- would either fail on that foreign key or erase the history.

ALTER TABLE admins ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ;

-- Who disabled them, for the same reason.
ALTER TABLE admins ADD COLUMN IF NOT EXISTS disabled_by BIGINT REFERENCES admins(id);
