import type {
  LeaderboardResponse,
  PlayerSnapshot,
  RoundFinishResponse,
  RoundStartResponse,
  VoucherResponse,
} from '@/lib/types';
import type { TapLogEntry } from '@/lib/game-rules';

export class ApiError extends Error {}

async function request<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const response = await fetch(path, {
    method: init?.method ?? 'GET',
    headers: init?.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new ApiError(payload.error ?? `Request failed (${response.status})`);
  return payload;
}

export const api = {
  me: () => request<PlayerSnapshot>('/api/me'),
  updateMe: (body: { name?: string; email?: string }) => request<PlayerSnapshot>('/api/me', { method: 'PATCH', body }),
  nonce: (address: string) => request<{ message: string }>('/api/auth/nonce', { method: 'POST', body: { address } }),
  verify: (address: string, signature: string) =>
    request<PlayerSnapshot>('/api/auth/verify', { method: 'POST', body: { address, signature } }),
  logout: () => request<PlayerSnapshot>('/api/auth/logout', { method: 'POST' }),
  emailLink: (email: string) => request<{ ok: true }>('/api/auth/email', { method: 'POST', body: { email } }),
  startRound: (txHash?: string) => request<RoundStartResponse>('/api/game/start', { method: 'POST', body: txHash ? { txHash } : {} }),
  finishRound: (roundId: string, log: TapLogEntry[]) =>
    request<RoundFinishResponse & { rejected?: string }>('/api/game/finish', { method: 'POST', body: { roundId, log } }),
  leaderboard: () => request<LeaderboardResponse>('/api/leaderboard'),
  voucher: () => request<VoucherResponse>('/api/rewards/voucher', { method: 'POST' }),
  demoClaim: () => request<{ amount: number; player: PlayerSnapshot }>('/api/demo', { method: 'POST', body: { action: 'claim' } }),
  demoBuy: (slug: string) => request<{ player: PlayerSnapshot }>('/api/demo', { method: 'POST', body: { action: 'buy', slug } }),
  demoBoost: (amount: number) => request<{ player: PlayerSnapshot }>('/api/demo', { method: 'POST', body: { action: 'boost', amount } }),
};
