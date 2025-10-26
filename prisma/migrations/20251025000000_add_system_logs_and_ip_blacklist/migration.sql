-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "action" TEXT NOT NULL,
    "method" TEXT,
    "path" TEXT NOT NULL,
    "query" JSONB,
    "body" JSONB,
    "statusCode" INTEGER,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "browserVersion" TEXT,
    "os" TEXT,
    "osVersion" TEXT,
    "isMobile" BOOLEAN NOT NULL DEFAULT false,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "country" TEXT,
    "city" TEXT,
    "responseTime" INTEGER,
    "errorMessage" TEXT,
    "errorStack" TEXT,
    "referrer" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IPBlacklist" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "blockedBy" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "blockedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "metadata" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IPBlacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IPBlacklist_ipAddress_key" ON "IPBlacklist"("ipAddress");

-- CreateIndex
CREATE INDEX "SystemLog_userId_idx" ON "SystemLog"("userId");

-- CreateIndex
CREATE INDEX "SystemLog_ipAddress_idx" ON "SystemLog"("ipAddress");

-- CreateIndex
CREATE INDEX "SystemLog_action_idx" ON "SystemLog"("action");

-- CreateIndex
CREATE INDEX "SystemLog_createdAt_idx" ON "SystemLog"("createdAt");

-- CreateIndex
CREATE INDEX "SystemLog_isBot_idx" ON "SystemLog"("isBot");

-- CreateIndex
CREATE INDEX "SystemLog_deviceType_idx" ON "SystemLog"("deviceType");

-- CreateIndex
CREATE INDEX "IPBlacklist_ipAddress_idx" ON "IPBlacklist"("ipAddress");

-- CreateIndex
CREATE INDEX "IPBlacklist_isActive_idx" ON "IPBlacklist"("isActive");

-- CreateIndex
CREATE INDEX "IPBlacklist_expiresAt_idx" ON "IPBlacklist"("expiresAt");

-- CreateIndex
CREATE INDEX "IPBlacklist_blockedBy_idx" ON "IPBlacklist"("blockedBy");

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPBlacklist" ADD CONSTRAINT "IPBlacklist_blockedBy_fkey" FOREIGN KEY ("blockedBy") REFERENCES "User"("id") ON UPDATE CASCADE;

