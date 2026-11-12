-- CreateTable
CREATE TABLE "AnalyticsPageView" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "pagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsPageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArcadeContractTransaction" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,

    CONSTRAINT "ArcadeContractTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArcadeContractEvent" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "playerAddress" TEXT,
    "amount" TEXT,
    "blockNumber" BIGINT NOT NULL,

    CONSTRAINT "ArcadeContractEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArcadeIndexState" (
    "id" TEXT NOT NULL,
    "lastIndexedBlock" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArcadeIndexState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsPageView_createdAt_idx" ON "AnalyticsPageView"("createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsPageView_visitorId_createdAt_idx" ON "AnalyticsPageView"("visitorId", "createdAt");

-- CreateIndex
CREATE INDEX "ArcadeContractTransaction_chainId_contractAddress_idx" ON "ArcadeContractTransaction"("chainId", "contractAddress");

-- CreateIndex
CREATE INDEX "ArcadeContractEvent_chainId_contractAddress_eventName_idx" ON "ArcadeContractEvent"("chainId", "contractAddress", "eventName");

-- CreateIndex
CREATE INDEX "ArcadeContractEvent_blockNumber_idx" ON "ArcadeContractEvent"("blockNumber");

