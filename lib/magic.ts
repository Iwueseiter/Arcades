import { Magic } from 'magic-sdk';

let _magic: Magic | null = null;

/**
 * Returns a singleton Magic client instance.
 * Must only be called in browser context ('use client' components).
 */
export function getMagic(): Magic {
  if (!_magic) {
    const key = process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY;
    if (!key) throw new Error('NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY is not set.');
    _magic = new Magic(key);
  }
  return _magic;
}
