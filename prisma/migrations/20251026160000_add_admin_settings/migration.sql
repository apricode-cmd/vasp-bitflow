-- CreateTable
CREATE TABLE IF NOT EXISTS "AdminSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionTimeout" INTEGER NOT NULL DEFAULT 30,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorMethod" TEXT,
    "loginNotifications" BOOLEAN NOT NULL DEFAULT true,
    "activityDigest" BOOLEAN NOT NULL DEFAULT false,
    "securityAlerts" BOOLEAN NOT NULL DEFAULT true,
    "allowedIPs" TEXT[],
    "blockUnknownDevices" BOOLEAN NOT NULL DEFAULT false,
    "logAllActions" BOOLEAN NOT NULL DEFAULT true,
    "retainLogsFor" INTEGER NOT NULL DEFAULT 90,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AdminSettings_userId_key" ON "AdminSettings"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminSettings_userId_idx" ON "AdminSettings"("userId");

-- AddForeignKey
ALTER TABLE "AdminSettings" ADD CONSTRAINT "AdminSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

