-- CreateTable
CREATE TABLE "SessionRevocation" (
    "id" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "revokedBy" TEXT NOT NULL,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionRevocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionRevocation_sessionKey_key" ON "SessionRevocation"("sessionKey");

-- CreateIndex
CREATE INDEX "SessionRevocation_sessionKey_idx" ON "SessionRevocation"("sessionKey");

-- CreateIndex
CREATE INDEX "SessionRevocation_userId_idx" ON "SessionRevocation"("userId");

-- CreateIndex
CREATE INDEX "SessionRevocation_ipAddress_idx" ON "SessionRevocation"("ipAddress");

-- CreateIndex
CREATE INDEX "SessionRevocation_expiresAt_idx" ON "SessionRevocation"("expiresAt");

-- CreateIndex
CREATE INDEX "SessionRevocation_createdAt_idx" ON "SessionRevocation"("createdAt");

-- AddForeignKey
ALTER TABLE "SessionRevocation" ADD CONSTRAINT "SessionRevocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionRevocation" ADD CONSTRAINT "SessionRevocation_revokedBy_fkey" FOREIGN KEY ("revokedBy") REFERENCES "User"("id") ON UPDATE CASCADE;

