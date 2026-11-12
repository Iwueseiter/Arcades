export type PlayerSnapshot = {
  id: string;
  name: string;
  displayName: string;
  email: string;
  address: string | null;
  bestScore: number;
  weeklyBest: number;
  gamesPlayed: number;
  totalScore: number;
  roundsLeft: number;
  maxRounds: number;
  /** Total G$ earned from ranked rounds (wallet players only). */
  earned: number;
  demo: {
    balance: number;
    purchases: string[];
    claimedToday: boolean;
    streak: number;
  };
};

export type LeaderboardRow = {
  rank: number;
  name: string;
  score: number;
  isYou: boolean;
  verifiedWallet: boolean;
};

export type LeaderboardResponse = {
  weekKey: string;
  resetsInMs: number;
  rows: LeaderboardRow[];
  you: LeaderboardRow | null;
};

export type RoundStartResponse = {
  roundId: string;
  seed: number;
  ranked: boolean;
  player: PlayerSnapshot;
};

export type RoundFinishResponse = {
  score: number;
  ranked: boolean;
  reward: number;
  newBest: boolean;
  player: PlayerSnapshot;
};

export type VoucherResponse = {
  cumulativeAmount: string;
  deadline: string;
  signature: `0x${string}`;
};
