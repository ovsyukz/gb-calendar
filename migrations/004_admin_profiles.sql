-- Admins gain a name and an email, and email becomes how they sign in.
--
-- An admin created by another admin starts with a temporary password and
-- must_change_password = true. Until they replace it, their session is
-- allowed to do exactly one thing: set a new password.

ALTER TABLE admins ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES admins(id);

-- Carry any existing account across: its username becomes both.
UPDATE admins SET email = username WHERE email IS NULL;
UPDATE admins SET name = username WHERE name IS NULL;

DROP INDEX IF EXISTS admins_username_key;
ALTER TABLE admins DROP COLUMN IF EXISTS username;

-- Case-insensitive, so Sarah@ and sarah@ are the same account.
CREATE UNIQUE INDEX IF NOT EXISTS admins_email_key ON admins (lower(email));
