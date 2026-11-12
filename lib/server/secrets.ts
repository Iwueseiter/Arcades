export function getSecret() {
  const secret = process.env.XURRI_SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('XURRI_SESSION_SECRET must be set to at least 32 characters in production');
  }
  return 'xurri-dev-only-session-secret-change-me';
}
