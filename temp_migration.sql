-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAYMENT_PENDING', 'PAYMENT_RECEIVED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "SettingType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON');

-- CreateEnum
CREATE TYPE "PaymentAccountType" AS ENUM ('BANK_ACCOUNT', 'CRYPTO_WALLET');

-- CreateEnum
CREATE TYPE "PayInStatus" AS ENUM ('PENDING', 'RECEIVED', 'VERIFIED', 'PARTIAL', 'MISMATCH', 'RECONCILED', 'FAILED', 'REFUNDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PayOutStatus" AS ENUM ('PENDING', 'QUEUED', 'PROCESSING', 'SENT', 'CONFIRMING', 'CONFIRMED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CurrencyType" AS ENUM ('FIAT', 'CRYPTO');

-- CreateEnum
CREATE TYPE "PaymentDirection" AS ENUM ('IN', 'OUT', 'BOTH');

-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('MANUAL', 'BANK_ACCOUNT', 'PSP', 'CRYPTO_WALLET');

-- CreateEnum
CREATE TYPE "AutomationLevel" AS ENUM ('MANUAL', 'SEMI_AUTO', 'FULLY_AUTO');

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
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
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
    "precision" INTEGER NOT NULL DEFAULT 8,
    "coingeckoId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isToken" BOOLEAN NOT NULL DEFAULT false,
    "iconUrl" TEXT,
    "minOrderAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.001,
    "maxOrderAmount" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "FiatCurrency" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "precision" INTEGER NOT NULL DEFAULT 2,
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
    "userWalletId" TEXT,
    "walletAddress" TEXT NOT NULL,
    "blockchainCode" TEXT,
    "paymentMethodCode" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdByAdmin" BOOLEAN NOT NULL DEFAULT false,
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
CREATE TABLE "PaymentAccount" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PaymentAccountType" NOT NULL,
    "description" TEXT,
    "currency" TEXT,
    "bankName" TEXT,
    "bankAddress" TEXT,
    "accountHolder" TEXT,
    "iban" TEXT,
    "swift" TEXT,
    "bic" TEXT,
    "sortCode" TEXT,
    "referenceTemplate" TEXT,
    "cryptocurrencyCode" TEXT,
    "blockchainCode" TEXT,
    "address" TEXT,
    "balance" DOUBLE PRECISION,
    "minBalance" DOUBLE PRECISION,
    "instructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "lastUsed" TIMESTAMP(3),
    "lastChecked" TIMESTAMP(3),
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "PaymentAccount_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "PayIn" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "fiatCurrencyCode" TEXT,
    "cryptocurrencyCode" TEXT,
    "currencyType" "CurrencyType" NOT NULL,
    "paymentMethodCode" TEXT,
    "senderName" TEXT,
    "senderAccount" TEXT,
    "senderBank" TEXT,
    "reference" TEXT,
    "networkCode" TEXT,
    "senderAddress" TEXT,
    "transactionHash" TEXT,
    "blockNumber" INTEGER,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "transactionId" TEXT,
    "status" "PayInStatus" NOT NULL DEFAULT 'PENDING',
    "expectedAmount" DOUBLE PRECISION NOT NULL,
    "receivedAmount" DOUBLE PRECISION,
    "amountMismatch" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verificationNotes" TEXT,
    "reconciledWith" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "reconciledBy" TEXT,
    "proofUrls" TEXT[],
    "explorerUrl" TEXT,
    "paymentDate" TIMESTAMP(3),
    "receivedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayOut" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "fiatCurrencyCode" TEXT,
    "cryptocurrencyCode" TEXT,
    "currencyType" "CurrencyType" NOT NULL,
    "networkCode" TEXT,
    "destinationAddress" TEXT,
    "destinationTag" TEXT,
    "userWalletId" TEXT,
    "transactionHash" TEXT,
    "explorerUrl" TEXT,
    "blockNumber" INTEGER,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "networkFee" DOUBLE PRECISION,
    "networkFeeCurrency" TEXT,
    "recipientName" TEXT,
    "recipientAccount" TEXT,
    "recipientBank" TEXT,
    "paymentReference" TEXT,
    "bankTransactionId" TEXT,
    "paymentMethodCode" TEXT,
    "status" "PayOutStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "processingNotes" TEXT,
    "paymentAccountId" TEXT,
    "fromWalletId" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayOut_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "BlockchainNetwork" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "nativeToken" TEXT NOT NULL,
    "nativeAsset" TEXT,
    "explorerUrl" TEXT NOT NULL,
    "rpcUrl" TEXT,
    "chainId" INTEGER,
    "minConfirmations" INTEGER NOT NULL DEFAULT 12,
    "confirmations" INTEGER NOT NULL DEFAULT 12,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockchainNetwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrencyBlockchainNetwork" (
    "id" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "blockchainCode" TEXT NOT NULL,
    "contractAddress" TEXT,
    "isNative" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurrencyBlockchainNetwork_pkey" PRIMARY KEY ("id")
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
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "direction" "PaymentDirection" NOT NULL DEFAULT 'IN',
    "providerType" "ProviderType" NOT NULL DEFAULT 'MANUAL',
    "automationLevel" "AutomationLevel" NOT NULL DEFAULT 'MANUAL',
    "currency" TEXT NOT NULL,
    "supportedNetworks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pspConnector" TEXT,
    "paymentAccountId" TEXT,
    "bankAccountId" TEXT,
    "minAmount" DOUBLE PRECISION,
    "maxAmount" DOUBLE PRECISION,
    "feeFixed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "processingTime" TEXT,
    "instructions" TEXT,
    "iconUrl" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAvailableForClients" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("code")
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
    "keyHash" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "RateProvider" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "apiConfig" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateProvider_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "RateSnapshot" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "fiatCode" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeProfile" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "spreadBps" INTEGER NOT NULL,
    "fixedFeeFiat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fiatCurrency" TEXT,
    "networkFeePolicy" TEXT NOT NULL DEFAULT 'pass-through',
    "networkFeeAmount" DOUBLE PRECISION,
    "networkFeePercent" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeProfile_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "KycLevel" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "allowMethods" TEXT[],
    "requirements" JSONB,
    "dailyLimit" DOUBLE PRECISION,
    "monthlyLimit" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycLevel_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "LimitsMatrix" (
    "id" TEXT NOT NULL,
    "kycLevel" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "fiatCurrency" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "limitAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LimitsMatrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PspConnector" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capabilities" TEXT[],
    "settlementCurrency" TEXT NOT NULL,
    "apiConfig" JSONB,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastTested" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'unconfigured',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PspConnector_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "OrderStatusConfig" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "nextStatuses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderStatusConfig_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "TransactionStatusConfig" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionStatusConfig_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "walletId" TEXT,
    "txHash" TEXT,
    "currencyCode" TEXT NOT NULL,
    "chainCode" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "fee" DOUBLE PRECISION,
    "statusCode" TEXT NOT NULL,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "broadcastAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WidgetConfig" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "supportedPairs" TEXT[],
    "defaultFiat" TEXT NOT NULL,
    "defaultCrypto" TEXT,
    "theme" JSONB NOT NULL,
    "minKycForMethods" JSONB NOT NULL,
    "allowedMethods" TEXT[],
    "feeProfileCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "domain" TEXT,
    "webhookUrl" TEXT,
    "apiKey" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WidgetConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserKycLevel" (
    "userId" TEXT NOT NULL,
    "kycLevel" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT
);

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

-- CreateTable
CREATE TABLE "AdminSettings" (
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
CREATE INDEX "Currency_isToken_idx" ON "Currency"("isToken");

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
CREATE INDEX "Order_userWalletId_idx" ON "Order"("userWalletId");

-- CreateIndex
CREATE INDEX "Order_blockchainCode_idx" ON "Order"("blockchainCode");

-- CreateIndex
CREATE INDEX "PaymentProof_orderId_idx" ON "PaymentProof"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAccount_code_key" ON "PaymentAccount"("code");

-- CreateIndex
CREATE INDEX "PaymentAccount_type_isActive_idx" ON "PaymentAccount"("type", "isActive");

-- CreateIndex
CREATE INDEX "PaymentAccount_currency_idx" ON "PaymentAccount"("currency");

-- CreateIndex
CREATE INDEX "PaymentAccount_cryptocurrencyCode_idx" ON "PaymentAccount"("cryptocurrencyCode");

-- CreateIndex
CREATE INDEX "PaymentAccount_isDefault_idx" ON "PaymentAccount"("isDefault");

-- CreateIndex
CREATE INDEX "BankDetails_currency_isActive_idx" ON "BankDetails"("currency", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformWallet_address_key" ON "PlatformWallet"("address");

-- CreateIndex
CREATE INDEX "PlatformWallet_currencyCode_isActive_idx" ON "PlatformWallet"("currencyCode", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PayIn_orderId_key" ON "PayIn"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PayIn_transactionId_key" ON "PayIn"("transactionId");

-- CreateIndex
CREATE INDEX "PayIn_orderId_idx" ON "PayIn"("orderId");

-- CreateIndex
CREATE INDEX "PayIn_userId_idx" ON "PayIn"("userId");

-- CreateIndex
CREATE INDEX "PayIn_fiatCurrencyCode_idx" ON "PayIn"("fiatCurrencyCode");

-- CreateIndex
CREATE INDEX "PayIn_cryptocurrencyCode_idx" ON "PayIn"("cryptocurrencyCode");

-- CreateIndex
CREATE INDEX "PayIn_status_idx" ON "PayIn"("status");

-- CreateIndex
CREATE INDEX "PayIn_currencyType_idx" ON "PayIn"("currencyType");

-- CreateIndex
CREATE INDEX "PayIn_paymentDate_idx" ON "PayIn"("paymentDate");

-- CreateIndex
CREATE INDEX "PayIn_transactionId_idx" ON "PayIn"("transactionId");

-- CreateIndex
CREATE INDEX "PayIn_transactionHash_idx" ON "PayIn"("transactionHash");

-- CreateIndex
CREATE INDEX "PayIn_createdAt_idx" ON "PayIn"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PayOut_orderId_key" ON "PayOut"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PayOut_transactionHash_key" ON "PayOut"("transactionHash");

-- CreateIndex
CREATE INDEX "PayOut_orderId_idx" ON "PayOut"("orderId");

-- CreateIndex
CREATE INDEX "PayOut_userId_idx" ON "PayOut"("userId");

-- CreateIndex
CREATE INDEX "PayOut_fiatCurrencyCode_idx" ON "PayOut"("fiatCurrencyCode");

-- CreateIndex
CREATE INDEX "PayOut_cryptocurrencyCode_idx" ON "PayOut"("cryptocurrencyCode");

-- CreateIndex
CREATE INDEX "PayOut_status_idx" ON "PayOut"("status");

-- CreateIndex
CREATE INDEX "PayOut_transactionHash_idx" ON "PayOut"("transactionHash");

-- CreateIndex
CREATE INDEX "PayOut_destinationAddress_idx" ON "PayOut"("destinationAddress");

-- CreateIndex
CREATE INDEX "PayOut_currencyType_idx" ON "PayOut"("currencyType");

-- CreateIndex
CREATE INDEX "PayOut_scheduledFor_idx" ON "PayOut"("scheduledFor");

-- CreateIndex
CREATE INDEX "PayOut_createdAt_idx" ON "PayOut"("createdAt");

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

-- CreateIndex
CREATE UNIQUE INDEX "BlockchainNetwork_code_key" ON "BlockchainNetwork"("code");

-- CreateIndex
CREATE INDEX "BlockchainNetwork_isActive_idx" ON "BlockchainNetwork"("isActive");

-- CreateIndex
CREATE INDEX "CurrencyBlockchainNetwork_currencyCode_idx" ON "CurrencyBlockchainNetwork"("currencyCode");

-- CreateIndex
CREATE INDEX "CurrencyBlockchainNetwork_blockchainCode_idx" ON "CurrencyBlockchainNetwork"("blockchainCode");

-- CreateIndex
CREATE INDEX "CurrencyBlockchainNetwork_isActive_idx" ON "CurrencyBlockchainNetwork"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CurrencyBlockchainNetwork_currencyCode_blockchainCode_key" ON "CurrencyBlockchainNetwork"("currencyCode", "blockchainCode");

-- CreateIndex
CREATE INDEX "UserWallet_userId_currencyCode_idx" ON "UserWallet"("userId", "currencyCode");

-- CreateIndex
CREATE INDEX "UserWallet_address_idx" ON "UserWallet"("address");

-- CreateIndex
CREATE UNIQUE INDEX "UserWallet_userId_address_key" ON "UserWallet"("userId", "address");

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
CREATE UNIQUE INDEX "PaymentMethod_code_key" ON "PaymentMethod"("code");

-- CreateIndex
CREATE INDEX "PaymentMethod_type_isActive_idx" ON "PaymentMethod"("type", "isActive");

-- CreateIndex
CREATE INDEX "PaymentMethod_currency_idx" ON "PaymentMethod"("currency");

-- CreateIndex
CREATE INDEX "PaymentMethod_direction_idx" ON "PaymentMethod"("direction");

-- CreateIndex
CREATE INDEX "PaymentMethod_providerType_idx" ON "PaymentMethod"("providerType");

-- CreateIndex
CREATE INDEX "PaymentMethod_automationLevel_idx" ON "PaymentMethod"("automationLevel");

-- CreateIndex
CREATE INDEX "PaymentMethod_isAvailableForClients_idx" ON "PaymentMethod"("isAvailableForClients");

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
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

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

-- CreateIndex
CREATE UNIQUE INDEX "RateProvider_code_key" ON "RateProvider"("code");

-- CreateIndex
CREATE INDEX "RateProvider_isActive_idx" ON "RateProvider"("isActive");

-- CreateIndex
CREATE INDEX "RateProvider_type_idx" ON "RateProvider"("type");

-- CreateIndex
CREATE INDEX "RateSnapshot_assetCode_fiatCode_timestamp_idx" ON "RateSnapshot"("assetCode", "fiatCode", "timestamp");

-- CreateIndex
CREATE INDEX "RateSnapshot_providerId_timestamp_idx" ON "RateSnapshot"("providerId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "FeeProfile_code_key" ON "FeeProfile"("code");

-- CreateIndex
CREATE INDEX "FeeProfile_isActive_idx" ON "FeeProfile"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "KycLevel_code_key" ON "KycLevel"("code");

-- CreateIndex
CREATE INDEX "KycLevel_isActive_idx" ON "KycLevel"("isActive");

-- CreateIndex
CREATE INDEX "LimitsMatrix_kycLevel_idx" ON "LimitsMatrix"("kycLevel");

-- CreateIndex
CREATE INDEX "LimitsMatrix_paymentMethod_idx" ON "LimitsMatrix"("paymentMethod");

-- CreateIndex
CREATE UNIQUE INDEX "LimitsMatrix_kycLevel_paymentMethod_fiatCurrency_period_key" ON "LimitsMatrix"("kycLevel", "paymentMethod", "fiatCurrency", "period");

-- CreateIndex
CREATE UNIQUE INDEX "PspConnector_code_key" ON "PspConnector"("code");

-- CreateIndex
CREATE INDEX "PspConnector_isEnabled_idx" ON "PspConnector"("isEnabled");

-- CreateIndex
CREATE INDEX "PspConnector_status_idx" ON "PspConnector"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OrderStatusConfig_code_key" ON "OrderStatusConfig"("code");

-- CreateIndex
CREATE INDEX "OrderStatusConfig_priority_idx" ON "OrderStatusConfig"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionStatusConfig_code_key" ON "TransactionStatusConfig"("code");

-- CreateIndex
CREATE INDEX "TransactionStatusConfig_priority_idx" ON "TransactionStatusConfig"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_txHash_key" ON "Transaction"("txHash");

-- CreateIndex
CREATE INDEX "Transaction_orderId_idx" ON "Transaction"("orderId");

-- CreateIndex
CREATE INDEX "Transaction_txHash_idx" ON "Transaction"("txHash");

-- CreateIndex
CREATE INDEX "Transaction_statusCode_idx" ON "Transaction"("statusCode");

-- CreateIndex
CREATE INDEX "Transaction_chainCode_idx" ON "Transaction"("chainCode");

-- CreateIndex
CREATE UNIQUE INDEX "WidgetConfig_code_key" ON "WidgetConfig"("code");

-- CreateIndex
CREATE INDEX "WidgetConfig_code_idx" ON "WidgetConfig"("code");

-- CreateIndex
CREATE INDEX "WidgetConfig_isActive_idx" ON "WidgetConfig"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "UserKycLevel_userId_key" ON "UserKycLevel"("userId");

-- CreateIndex
CREATE INDEX "UserKycLevel_kycLevel_idx" ON "UserKycLevel"("kycLevel");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_service_key" ON "Integration"("service");

-- CreateIndex
CREATE INDEX "Integration_service_idx" ON "Integration"("service");

-- CreateIndex
CREATE INDEX "Integration_isEnabled_idx" ON "Integration"("isEnabled");

-- CreateIndex
CREATE INDEX "Integration_status_idx" ON "Integration"("status");

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
CREATE UNIQUE INDEX "IPBlacklist_ipAddress_key" ON "IPBlacklist"("ipAddress");

-- CreateIndex
CREATE INDEX "IPBlacklist_ipAddress_idx" ON "IPBlacklist"("ipAddress");

-- CreateIndex
CREATE INDEX "IPBlacklist_isActive_idx" ON "IPBlacklist"("isActive");

-- CreateIndex
CREATE INDEX "IPBlacklist_expiresAt_idx" ON "IPBlacklist"("expiresAt");

-- CreateIndex
CREATE INDEX "IPBlacklist_blockedBy_idx" ON "IPBlacklist"("blockedBy");

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

-- CreateIndex
CREATE UNIQUE INDEX "AdminSettings_userId_key" ON "AdminSettings"("userId");

-- CreateIndex
CREATE INDEX "AdminSettings_userId_idx" ON "AdminSettings"("userId");

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
ALTER TABLE "Order" ADD CONSTRAINT "Order_userWalletId_fkey" FOREIGN KEY ("userWalletId") REFERENCES "UserWallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_blockchainCode_fkey" FOREIGN KEY ("blockchainCode") REFERENCES "BlockchainNetwork"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_paymentMethodCode_fkey" FOREIGN KEY ("paymentMethodCode") REFERENCES "PaymentMethod"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAccount" ADD CONSTRAINT "PaymentAccount_currency_fkey" FOREIGN KEY ("currency") REFERENCES "FiatCurrency"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAccount" ADD CONSTRAINT "PaymentAccount_cryptocurrencyCode_fkey" FOREIGN KEY ("cryptocurrencyCode") REFERENCES "Currency"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAccount" ADD CONSTRAINT "PaymentAccount_blockchainCode_fkey" FOREIGN KEY ("blockchainCode") REFERENCES "BlockchainNetwork"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankDetails" ADD CONSTRAINT "BankDetails_currency_fkey" FOREIGN KEY ("currency") REFERENCES "FiatCurrency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformWallet" ADD CONSTRAINT "PlatformWallet_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformWallet" ADD CONSTRAINT "PlatformWallet_blockchainCode_fkey" FOREIGN KEY ("blockchainCode") REFERENCES "BlockchainNetwork"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayIn" ADD CONSTRAINT "PayIn_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayIn" ADD CONSTRAINT "PayIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayIn" ADD CONSTRAINT "PayIn_fiatCurrencyCode_fkey" FOREIGN KEY ("fiatCurrencyCode") REFERENCES "FiatCurrency"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayIn" ADD CONSTRAINT "PayIn_cryptocurrencyCode_fkey" FOREIGN KEY ("cryptocurrencyCode") REFERENCES "Currency"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayIn" ADD CONSTRAINT "PayIn_networkCode_fkey" FOREIGN KEY ("networkCode") REFERENCES "BlockchainNetwork"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayIn" ADD CONSTRAINT "PayIn_paymentMethodCode_fkey" FOREIGN KEY ("paymentMethodCode") REFERENCES "PaymentMethod"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayIn" ADD CONSTRAINT "PayIn_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayIn" ADD CONSTRAINT "PayIn_reconciledBy_fkey" FOREIGN KEY ("reconciledBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayOut" ADD CONSTRAINT "PayOut_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayOut" ADD CONSTRAINT "PayOut_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayOut" ADD CONSTRAINT "PayOut_cryptocurrencyCode_fkey" FOREIGN KEY ("cryptocurrencyCode") REFERENCES "Currency"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayOut" ADD CONSTRAINT "PayOut_fiatCurrencyCode_fkey" FOREIGN KEY ("fiatCurrencyCode") REFERENCES "FiatCurrency"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayOut" ADD CONSTRAINT "PayOut_networkCode_fkey" FOREIGN KEY ("networkCode") REFERENCES "BlockchainNetwork"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayOut" ADD CONSTRAINT "PayOut_userWalletId_fkey" FOREIGN KEY ("userWalletId") REFERENCES "UserWallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayOut" ADD CONSTRAINT "PayOut_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayOut" ADD CONSTRAINT "PayOut_paymentAccountId_fkey" FOREIGN KEY ("paymentAccountId") REFERENCES "PaymentAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayOut" ADD CONSTRAINT "PayOut_paymentMethodCode_fkey" FOREIGN KEY ("paymentMethodCode") REFERENCES "PaymentMethod"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayOut" ADD CONSTRAINT "PayOut_fromWalletId_fkey" FOREIGN KEY ("fromWalletId") REFERENCES "PlatformWallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurrencyBlockchainNetwork" ADD CONSTRAINT "CurrencyBlockchainNetwork_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurrencyBlockchainNetwork" ADD CONSTRAINT "CurrencyBlockchainNetwork_blockchainCode_fkey" FOREIGN KEY ("blockchainCode") REFERENCES "BlockchainNetwork"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWallet" ADD CONSTRAINT "UserWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWallet" ADD CONSTRAINT "UserWallet_blockchainCode_fkey" FOREIGN KEY ("blockchainCode") REFERENCES "BlockchainNetwork"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWallet" ADD CONSTRAINT "UserWallet_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_kycSessionId_fkey" FOREIGN KEY ("kycSessionId") REFERENCES "KycSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycFormData" ADD CONSTRAINT "KycFormData_kycSessionId_fkey" FOREIGN KEY ("kycSessionId") REFERENCES "KycSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_currency_fkey" FOREIGN KEY ("currency") REFERENCES "FiatCurrency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_pspConnector_fkey" FOREIGN KEY ("pspConnector") REFERENCES "PspConnector"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_paymentAccountId_fkey" FOREIGN KEY ("paymentAccountId") REFERENCES "PaymentAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankDetails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKeyUsage" ADD CONSTRAINT "ApiKeyUsage_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFactorAuth" ADD CONSTRAINT "TwoFactorAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateSnapshot" ADD CONSTRAINT "RateSnapshot_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "RateProvider"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeProfile" ADD CONSTRAINT "FeeProfile_fiatCurrency_fkey" FOREIGN KEY ("fiatCurrency") REFERENCES "FiatCurrency"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LimitsMatrix" ADD CONSTRAINT "LimitsMatrix_kycLevel_fkey" FOREIGN KEY ("kycLevel") REFERENCES "KycLevel"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LimitsMatrix" ADD CONSTRAINT "LimitsMatrix_paymentMethod_fkey" FOREIGN KEY ("paymentMethod") REFERENCES "PaymentMethod"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LimitsMatrix" ADD CONSTRAINT "LimitsMatrix_fiatCurrency_fkey" FOREIGN KEY ("fiatCurrency") REFERENCES "FiatCurrency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_chainCode_fkey" FOREIGN KEY ("chainCode") REFERENCES "BlockchainNetwork"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserKycLevel" ADD CONSTRAINT "UserKycLevel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPBlacklist" ADD CONSTRAINT "IPBlacklist_blockedBy_fkey" FOREIGN KEY ("blockedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionRevocation" ADD CONSTRAINT "SessionRevocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionRevocation" ADD CONSTRAINT "SessionRevocation_revokedBy_fkey" FOREIGN KEY ("revokedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminSettings" ADD CONSTRAINT "AdminSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

