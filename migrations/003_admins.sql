-- Admin accounts.
--
-- Replaces the single ADMIN_PASSWORD environment variable, so there can be
-- more than one coach with access and a password can be changed without a
-- redeploy.
--
-- password_hash holds a one-way scrypt hash (see _lib/passwords.js), never
-- the password itself and never anything reversible.

CREATE TABLE IF NOT EXISTS admins (
  id            BIGSERIAL PRIMARY KEY,
  username      TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- Case-insensitive: "Sarah" and "sarah" are the same account, so nobody can
-- register a lookalike username.
CREATE UNIQUE INDEX IF NOT EXISTS admins_username_key ON admins (lower(username));
