import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

/**
 * Password hashing with scrypt.
 *
 * Hashed, not encrypted: encryption is reversible, so a leaked key would hand
 * over every password in plaintext. We never need to read a password back —
 * only to check whether a submitted one matches — so a one-way function is
 * both safer and sufficient.
 *
 * scrypt is memory-hard, which makes bulk GPU cracking expensive, and it
 * ships inside Node. bcrypt and argon2 are fine choices too, but both need
 * native builds that complicate bundling for serverless.
 *
 * Stored form: scrypt$N$r$p$<salt base64>$<hash base64>
 * The parameters travel with the hash, so raising the cost later does not
 * invalidate passwords already stored.
 */

const derive = promisify(scrypt);

const COST = 16384; // N — CPU/memory cost
const BLOCK_SIZE = 8; // r
const PARALLEL = 1; // p
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export async function hashPassword(password) {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLEL,
  });

  return [
    'scrypt',
    COST,
    BLOCK_SIZE,
    PARALLEL,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$');
}

/** Never throws on a malformed stored value — a bad row is simply a failed login. */
export async function verifyPassword(password, stored) {
  try {
    const [scheme, cost, blockSize, parallel, salt, expected] = String(stored).split('$');
    if (scheme !== 'scrypt') return false;

    const expectedKey = Buffer.from(expected, 'base64');
    const actualKey = await derive(
      password,
      Buffer.from(salt, 'base64'),
      expectedKey.length,
      {
        N: Number(cost),
        r: Number(blockSize),
        p: Number(parallel),
      }
    );

    return timingSafeEqual(actualKey, expectedKey);
  } catch {
    return false;
  }
}
