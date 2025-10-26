-- CreateEnum: PayInStatus
CREATE TYPE "PayInStatus" AS ENUM ('PENDING', 'RECEIVED', 'VERIFIED', 'PARTIAL', 'MISMATCH', 'RECONCILED', 'FAILED', 'REFUNDED', 'EXPIRED');

-- CreateEnum: PayOutStatus  
CREATE TYPE "PayOutStatus" AS ENUM ('PENDING', 'QUEUED', 'PROCESSING', 'SENT', 'CONFIRMING', 'CONFIRMED', 'FAILED', 'CANCELLED');

-- CreateTable: PayIn (Входящие платежи)
CREATE TABLE "PayIn" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentMethodCode" TEXT NOT NULL,
    "senderName" TEXT,
    "senderAccount" TEXT,
    "senderBank" TEXT,
    "reference" TEXT,
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
    "paymentDate" TIMESTAMP(3),
    "receivedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PayOut (Исходящие платежи)
CREATE TABLE "PayOut" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "networkCode" TEXT NOT NULL,
    "destinationAddress" TEXT NOT NULL,
    "destinationTag" TEXT,
    "userWalletId" TEXT,
    "transactionHash" TEXT,
    "explorerUrl" TEXT,
    "blockNumber" INTEGER,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "networkFee" DOUBLE PRECISION NOT NULL,
    "networkFeeCurrency" TEXT NOT NULL,
    "status" "PayOutStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "processingNotes" TEXT,
    "fromWalletId" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayOut_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayIn_orderId_key" ON "PayIn"("orderId");
CREATE UNIQUE INDEX "PayIn_transactionId_key" ON "PayIn"("transactionId");
CREATE INDEX "PayIn_orderId_idx" ON "PayIn"("orderId");
CREATE INDEX "PayIn_userId_idx" ON "PayIn"("userId");
CREATE INDEX "PayIn_status_idx" ON "PayIn"("status");
CREATE INDEX "PayIn_paymentDate_idx" ON "PayIn"("paymentDate");
CREATE INDEX "PayIn_transactionId_idx" ON "PayIn"("transactionId");
CREATE INDEX "PayIn_createdAt_idx" ON "PayIn"("createdAt");

CREATE UNIQUE INDEX "PayOut_orderId_key" ON "PayOut"("orderId");
CREATE UNIQUE INDEX "PayOut_transactionHash_key" ON "PayOut"("transactionHash");
CREATE INDEX "PayOut_orderId_idx" ON "PayOut"("orderId");
CREATE INDEX "PayOut_userId_idx" ON "PayOut"("userId");
CREATE INDEX "PayOut_status_idx" ON "PayOut"("status");
CREATE INDEX "PayOut_transactionHash_idx" ON "PayOut"("transactionHash");
CREATE INDEX "PayOut_destinationAddress_idx" ON "PayOut"("destinationAddress");
CREATE INDEX "PayOut_scheduledFor_idx" ON "PayOut"("scheduledFor");
CREATE INDEX "PayOut_createdAt_idx" ON "PayOut"("createdAt");

-- AddForeignKey
ALTER TABLE "PayIn" ADD CONSTRAINT "PayIn_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayIn" ADD CONSTRAINT "PayIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayIn" ADD CONSTRAINT "PayIn_currency_fkey" FOREIGN KEY ("currency") REFERENCES "FiatCurrency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayIn" ADD CONSTRAINT "PayIn_paymentMethodCode_fkey" FOREIGN KEY ("paymentMethodCode") REFERENCES "PaymentMethod"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayIn" ADD CONSTRAINT "PayIn_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayIn" ADD CONSTRAINT "PayIn_reconciledBy_fkey" FOREIGN KEY ("reconciledBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PayOut" ADD CONSTRAINT "PayOut_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayOut" ADD CONSTRAINT "PayOut_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayOut" ADD CONSTRAINT "PayOut_currency_fkey" FOREIGN KEY ("currency") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayOut" ADD CONSTRAINT "PayOut_networkCode_fkey" FOREIGN KEY ("networkCode") REFERENCES "BlockchainNetwork"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayOut" ADD CONSTRAINT "PayOut_userWalletId_fkey" FOREIGN KEY ("userWalletId") REFERENCES "UserWallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayOut" ADD CONSTRAINT "PayOut_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayOut" ADD CONSTRAINT "PayOut_fromWalletId_fkey" FOREIGN KEY ("fromWalletId") REFERENCES "PlatformWallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

