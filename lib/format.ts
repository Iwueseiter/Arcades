export const formatG = (value: number, digits = 2) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: digits });

export const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

const AVATAR_COLORS = ['#5b7cff', '#9b6bff', '#ff5fae', '#3ee8b5', '#f59e0b', '#06b6d4', '#ef4444', '#84cc16'];

export const avatarColor = (seed: string) => {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export const initials = (name: string) => (name.replace(/^0x/i, '').trim()[0] ?? '?').toUpperCase();

export function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
