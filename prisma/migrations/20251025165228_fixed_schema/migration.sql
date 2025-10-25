/*
  Warnings:

  - You are about to drop the `audit_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bank_details` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `currencies` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `email_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `fiat_currencies` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `kyc_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `orders` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payment_proofs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `profiles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rate_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `system_settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `trading_pairs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "bank_details" DROP CONSTRAINT "bank_details_currency_fkey";

-- DropForeignKey
ALTER TABLE "email_logs" DROP CONSTRAINT "email_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "kyc_sessions" DROP CONSTRAINT "kyc_sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_currencyCode_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_fiatCurrencyCode_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_userId_fkey";

-- DropForeignKey
ALTER TABLE "payment_proofs" DROP CONSTRAINT "payment_proofs_orderId_fkey";

-- DropForeignKey
ALTER TABLE "payment_proofs" DROP CONSTRAINT "payment_proofs_uploadedBy_fkey";

-- DropForeignKey
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_userId_fkey";

-- DropForeignKey
ALTER TABLE "rate_history" DROP CONSTRAINT "rate_history_cryptoCode_fkey";

-- DropForeignKey
ALTER TABLE "rate_history" DROP CONSTRAINT "rate_history_fiatCode_fkey";

-- DropForeignKey
ALTER TABLE "trading_pairs" DROP CONSTRAINT "trading_pairs_cryptoCode_fkey";

-- DropForeignKey
ALTER TABLE "trading_pairs" DROP CONSTRAINT "trading_pairs_fiatCode_fkey";

-- DropTable
DROP TABLE "audit_logs";

-- DropTable
DROP TABLE "bank_details";

-- DropTable
DROP TABLE "currencies";

-- DropTable
DROP TABLE "email_logs";

-- DropTable
DROP TABLE "fiat_currencies";

-- DropTable
DROP TABLE "kyc_sessions";

-- DropTable
DROP TABLE "orders";

-- DropTable
DROP TABLE "payment_proofs";

-- DropTable
DROP TABLE "profiles";

-- DropTable
DROP TABLE "rate_history";

-- DropTable
DROP TABLE "system_settings";

-- DropTable
DROP TABLE "trading_pairs";

-- DropTable
DROP TABLE "users";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "country" TEXT NOT NULL,
    "city" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "nationality" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kycaidVerificationId" TEXT,
    "kycaidApplicantId" TEXT,
    "kycaidFormId" TEXT,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "webhookData" JSONB,
    "metadata" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Currency" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL DEFAULT 8,
    "coingeckoId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "FiatCurrency" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiatCurrency_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "TradingPair" (
    "id" TEXT NOT NULL,
    "cryptoCode" TEXT NOT NULL,
    "fiatCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "minCryptoAmount" DOUBLE PRECISION NOT NULL,
    "maxCryptoAmount" DOUBLE PRECISION NOT NULL,
    "minFiatAmount" DOUBLE PRECISION NOT NULL,
    "maxFiatAmount" DOUBLE PRECISION NOT NULL,
    "feePercent" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingPair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateHistory" (
    "id" TEXT NOT NULL,
    "cryptoCode" TEXT NOT NULL,
    "fiatCode" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'coingecko',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "fiatCurrencyCode" TEXT NOT NULL,
    "paymentReference" TEXT NOT NULL,
    "cryptoAmount" DOUBLE PRECISION NOT NULL,
    "fiatAmount" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "feePercent" DOUBLE PRECISION NOT NULL,
    "feeAmount" DOUBLE PRECISION NOT NULL,
    "totalFiat" DOUBLE PRECISION NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "transactionHash" TEXT,
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProof" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankDetails" (
    "id" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankAddress" TEXT,
    "accountHolder" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "swift" TEXT,
    "bic" TEXT,
    "sortCode" TEXT,
    "referenceTemplate" TEXT NOT NULL DEFAULT 'APR-{orderId}',
    "instructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" "SettingType" NOT NULL DEFAULT 'STRING',
    "category" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "Profile_country_idx" ON "Profile"("country");

-- CreateIndex
CREATE UNIQUE INDEX "KycSession_userId_key" ON "KycSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "KycSession_kycaidVerificationId_key" ON "KycSession"("kycaidVerificationId");

-- CreateIndex
CREATE INDEX "KycSession_status_idx" ON "KycSession"("status");

-- CreateIndex
CREATE INDEX "KycSession_kycaidVerificationId_idx" ON "KycSession"("kycaidVerificationId");

-- CreateIndex
CREATE INDEX "TradingPair_isActive_idx" ON "TradingPair"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TradingPair_cryptoCode_fiatCode_key" ON "TradingPair"("cryptoCode", "fiatCode");

-- CreateIndex
CREATE INDEX "RateHistory_cryptoCode_fiatCode_createdAt_idx" ON "RateHistory"("cryptoCode", "fiatCode", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_paymentReference_key" ON "Order"("paymentReference");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_paymentReference_idx" ON "Order"("paymentReference");

-- CreateIndex
CREATE INDEX "PaymentProof_orderId_idx" ON "PaymentProof"("orderId");

-- CreateIndex
CREATE INDEX "BankDetails_currency_isActive_idx" ON "BankDetails"("currency", "isActive");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_userId_idx" ON "EmailLog"("userId");

-- CreateIndex
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");

-- CreateIndex
CREATE INDEX "EmailLog_template_idx" ON "EmailLog"("template");

-- CreateIndex
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

-- CreateIndex
CREATE INDEX "SystemSettings_category_idx" ON "SystemSettings"("category");

-- CreateIndex
CREATE INDEX "SystemSettings_isPublic_idx" ON "SystemSettings"("isPublic");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycSession" ADD CONSTRAINT "KycSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingPair" ADD CONSTRAINT "TradingPair_cryptoCode_fkey" FOREIGN KEY ("cryptoCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingPair" ADD CONSTRAINT "TradingPair_fiatCode_fkey" FOREIGN KEY ("fiatCode") REFERENCES "FiatCurrency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateHistory" ADD CONSTRAINT "RateHistory_cryptoCode_fkey" FOREIGN KEY ("cryptoCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateHistory" ADD CONSTRAINT "RateHistory_fiatCode_fkey" FOREIGN KEY ("fiatCode") REFERENCES "FiatCurrency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_fiatCurrencyCode_fkey" FOREIGN KEY ("fiatCurrencyCode") REFERENCES "FiatCurrency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankDetails" ADD CONSTRAINT "BankDetails_currency_fkey" FOREIGN KEY ("currency") REFERENCES "FiatCurrency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
