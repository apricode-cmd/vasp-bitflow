-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "apiKey" TEXT,
    "apiEndpoint" TEXT,
    "lastTested" TIMESTAMP(3),
    "config" JSONB,
    "rates" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Integration_service_key" ON "Integration"("service");

-- CreateIndex
CREATE INDEX "Integration_service_idx" ON "Integration"("service");

-- CreateIndex
CREATE INDEX "Integration_isEnabled_idx" ON "Integration"("isEnabled");

-- CreateIndex
CREATE INDEX "Integration_status_idx" ON "Integration"("status");
