-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "address" TEXT,
    "identityRoot" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "weekKey" TEXT NOT NULL DEFAULT '',
    "weeklyBest" INTEGER NOT NULL DEFAULT 0,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "roundsDay" TEXT NOT NULL DEFAULT '',
    "roundsUsed" INTEGER NOT NULL DEFAULT 0,
    "earnedMilli" INTEGER NOT NULL DEFAULT 0,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "demoBalance" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "demoPurchases" TEXT NOT NULL DEFAULT '[]',
    "demoLastClaim" TEXT,
    "demoStreak" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRound" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "seed" INTEGER NOT NULL,
    "ranked" BOOLEAN NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "score" INTEGER,
    "weekKey" TEXT,
    "flagged" TEXT,
    "txHash" TEXT,

    CONSTRAINT "GameRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "weekKey" TEXT NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("weekKey")
);

-- CreateTable
CREATE TABLE "TournamentPrize" (
    "id" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "amountMilli" INTEGER NOT NULL,

    CONSTRAINT "TournamentPrize_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_address_key" ON "Player"("address");

-- CreateIndex
CREATE INDEX "Player_weekKey_weeklyBest_idx" ON "Player"("weekKey", "weeklyBest");

-- CreateIndex
CREATE INDEX "Player_identityRoot_idx" ON "Player"("identityRoot");

-- CreateIndex
CREATE UNIQUE INDEX "GameRound_txHash_key" ON "GameRound"("txHash");

-- CreateIndex
CREATE INDEX "GameRound_playerId_startedAt_idx" ON "GameRound"("playerId", "startedAt");

-- CreateIndex
CREATE INDEX "GameRound_weekKey_score_idx" ON "GameRound"("weekKey", "score");

-- CreateIndex
CREATE INDEX "TournamentPrize_playerId_idx" ON "TournamentPrize"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentPrize_weekKey_rank_key" ON "TournamentPrize"("weekKey", "rank");

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPrize" ADD CONSTRAINT "TournamentPrize_weekKey_fkey" FOREIGN KEY ("weekKey") REFERENCES "Tournament"("weekKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPrize" ADD CONSTRAINT "TournamentPrize_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

