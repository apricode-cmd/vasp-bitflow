-- AlterTable
ALTER TABLE "KycSession" ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "reviewedBy" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "createdByAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentMethodId" TEXT;

-- CreateTable
CREATE TABLE "BlockchainNetwork" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nativeToken" TEXT NOT NULL,
    "explorerUrl" TEXT NOT NULL,
    "rpcUrl" TEXT,
    "chainId" INTEGER,
    "confirmations" INTEGER NOT NULL DEFAULT 12,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockchainNetwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "blockchainCode" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "label" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformWallet" (
    "id" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "blockchainCode" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "oldStatus" "OrderStatus" NOT NULL,
    "newStatus" "OrderStatus" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycFormField" (
    "id" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL,
    "validation" JSONB,
    "options" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycFormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycDocument" (
    "id" TEXT NOT NULL,
    "kycSessionId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "verifiedByAI" BOOLEAN NOT NULL DEFAULT false,
    "verificationData" JSONB,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycFormData" (
    "id" TEXT NOT NULL,
    "kycSessionId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycFormData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "processingTime" TEXT,
    "minAmount" DOUBLE PRECISION,
    "maxAmount" DOUBLE PRECISION,
    "feeFixed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "instructions" TEXT,
    "config" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualRate" (
    "id" TEXT NOT NULL,
    "cryptoCode" TEXT NOT NULL,
    "fiatCode" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationSetting" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "lastTested" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'unconfigured',
    "errorLog" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "IntegrationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "lastUsedIp" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "rateLimit" INTEGER NOT NULL DEFAULT 100,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKeyUsage" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKeyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IpRule" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "IpRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwoFactorAuth" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backupCodes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwoFactorAuth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRetentionPolicy" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "retentionDays" INTEGER NOT NULL,
    "autoDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataRetentionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlockchainNetwork_code_key" ON "BlockchainNetwork"("code");

-- CreateIndex
CREATE INDEX "BlockchainNetwork_isActive_idx" ON "BlockchainNetwork"("isActive");

-- CreateIndex
CREATE INDEX "UserWallet_userId_currencyCode_idx" ON "UserWallet"("userId", "currencyCode");

-- CreateIndex
CREATE INDEX "UserWallet_address_idx" ON "UserWallet"("address");

-- CreateIndex
CREATE UNIQUE INDEX "UserWallet_userId_address_key" ON "UserWallet"("userId", "address");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformWallet_address_key" ON "PlatformWallet"("address");

-- CreateIndex
CREATE INDEX "PlatformWallet_currencyCode_isActive_idx" ON "PlatformWallet"("currencyCode", "isActive");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_idx" ON "OrderStatusHistory"("orderId");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_createdAt_idx" ON "OrderStatusHistory"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "KycFormField_fieldName_key" ON "KycFormField"("fieldName");

-- CreateIndex
CREATE INDEX "KycFormField_category_idx" ON "KycFormField"("category");

-- CreateIndex
CREATE INDEX "KycFormField_isEnabled_idx" ON "KycFormField"("isEnabled");

-- CreateIndex
CREATE INDEX "KycDocument_kycSessionId_idx" ON "KycDocument"("kycSessionId");

-- CreateIndex
CREATE INDEX "KycDocument_documentType_idx" ON "KycDocument"("documentType");

-- CreateIndex
CREATE INDEX "KycFormData_kycSessionId_idx" ON "KycFormData"("kycSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "KycFormData_kycSessionId_fieldName_key" ON "KycFormData"("kycSessionId", "fieldName");

-- CreateIndex
CREATE INDEX "PaymentMethod_type_isActive_idx" ON "PaymentMethod"("type", "isActive");

-- CreateIndex
CREATE INDEX "PaymentMethod_currency_idx" ON "PaymentMethod"("currency");

-- CreateIndex
CREATE INDEX "ManualRate_cryptoCode_fiatCode_isActive_idx" ON "ManualRate"("cryptoCode", "fiatCode", "isActive");

-- CreateIndex
CREATE INDEX "ManualRate_validFrom_validTo_idx" ON "ManualRate"("validFrom", "validTo");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationSetting_service_key" ON "IntegrationSetting"("service");

-- CreateIndex
CREATE INDEX "IntegrationSetting_service_idx" ON "IntegrationSetting"("service");

-- CreateIndex
CREATE INDEX "IntegrationSetting_status_idx" ON "IntegrationSetting"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_key_idx" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE INDEX "ApiKey_isActive_idx" ON "ApiKey"("isActive");

-- CreateIndex
CREATE INDEX "ApiKey_prefix_idx" ON "ApiKey"("prefix");

-- CreateIndex
CREATE INDEX "ApiKeyUsage_apiKeyId_createdAt_idx" ON "ApiKeyUsage"("apiKeyId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiKeyUsage_endpoint_idx" ON "ApiKeyUsage"("endpoint");

-- CreateIndex
CREATE INDEX "ApiKeyUsage_createdAt_idx" ON "ApiKeyUsage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IpRule_ipAddress_key" ON "IpRule"("ipAddress");

-- CreateIndex
CREATE INDEX "IpRule_ipAddress_type_idx" ON "IpRule"("ipAddress", "type");

-- CreateIndex
CREATE INDEX "IpRule_type_idx" ON "IpRule"("type");

-- CreateIndex
CREATE UNIQUE INDEX "TwoFactorAuth_userId_key" ON "TwoFactorAuth"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DataRetentionPolicy_entityType_key" ON "DataRetentionPolicy"("entityType");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWallet" ADD CONSTRAINT "UserWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWallet" ADD CONSTRAINT "UserWallet_blockchainCode_fkey" FOREIGN KEY ("blockchainCode") REFERENCES "BlockchainNetwork"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWallet" ADD CONSTRAINT "UserWallet_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformWallet" ADD CONSTRAINT "PlatformWallet_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformWallet" ADD CONSTRAINT "PlatformWallet_blockchainCode_fkey" FOREIGN KEY ("blockchainCode") REFERENCES "BlockchainNetwork"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_kycSessionId_fkey" FOREIGN KEY ("kycSessionId") REFERENCES "KycSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycFormData" ADD CONSTRAINT "KycFormData_kycSessionId_fkey" FOREIGN KEY ("kycSessionId") REFERENCES "KycSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_currency_fkey" FOREIGN KEY ("currency") REFERENCES "FiatCurrency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKeyUsage" ADD CONSTRAINT "ApiKeyUsage_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFactorAuth" ADD CONSTRAINT "TwoFactorAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
