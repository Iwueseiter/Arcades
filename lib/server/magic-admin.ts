import { Magic } from '@magic-sdk/admin';

let _admin: Magic | null = null;

/**
 * Returns a singleton Magic Admin SDK instance.
 * Server-only — never import this in client components.
 */
export function getMagicAdmin(): Magic {
  if (!_admin) {
    const key = process.env.MAGIC_SECRET_KEY;
    if (!key) throw new Error('MAGIC_SECRET_KEY is not set.');
    _admin = new Magic(key);
  }
  return _admin;
}
