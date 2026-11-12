-- CreateTable
CREATE TABLE "PotBoost" (
    "id" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "amountMilli" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PotBoost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PotBoost_weekKey_idx" ON "PotBoost"("weekKey");

-- AddForeignKey
ALTER TABLE "PotBoost" ADD CONSTRAINT "PotBoost_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

