/**
 * Simulate TopUp Payment via BCB Webhook
 * 
 * Usage:
 * npx tsx scripts/simulate-topup-payment.ts <email> <reference> <amount>
 * 
 * Example:
 * npx tsx scripts/simulate-topup-payment.ts bogddan.apricode@gmail.com TU-9304-B488F4 5000
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [, , email, reference, amountStr] = process.argv;

  if (!email || !reference || !amountStr) {
    console.error('❌ Usage: npx tsx scripts/simulate-topup-payment.ts <email> <reference> <amount>');
    console.error('   Example: npx tsx scripts/simulate-topup-payment.ts bogddan.apricode@gmail.com TU-9304-B488F4 5000');
    process.exit(1);
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    console.error('❌ Invalid amount:', amountStr);
    process.exit(1);
  }

  console.log('🔍 Looking up user and TopUp request...\n');

  // 1. Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      virtualIbanAccounts: {
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!user) {
    console.error('❌ User not found:', email);
    process.exit(1);
  }

  if (!user.virtualIbanAccounts || user.virtualIbanAccounts.length === 0) {
    console.error('❌ User has no active Virtual IBAN account');
    process.exit(1);
  }

  const virtualIban = user.virtualIbanAccounts[0];
  
  console.log('✅ User found:', {
    email: user.email,
    userId: user.id,
    iban: virtualIban.iban,
    currentBalance: virtualIban.balance,
  });

  // 2. Find TopUp request by reference
  const topUpRequest = await prisma.topUpRequest.findUnique({
    where: { reference },
  });

  if (!topUpRequest) {
    console.error('❌ TopUp request not found with reference:', reference);
    console.log('\n💡 Available PENDING requests for this user:');
    
    const pending = await prisma.topUpRequest.findMany({
      where: {
        userId: user.id,
        status: 'PENDING',
      },
      select: {
        reference: true,
        amount: true,
        currency: true,
        createdAt: true,
        expiresAt: true,
      },
    });
    
    if (pending.length > 0) {
      pending.forEach(req => {
        console.log(`   - ${req.reference}: ${req.currency} ${req.amount} (expires: ${req.expiresAt})`);
      });
    } else {
      console.log('   (none)');
    }
    
    process.exit(1);
  }

  if (topUpRequest.userId !== user.id) {
    console.error('❌ TopUp request does not belong to this user');
    process.exit(1);
  }

  if (topUpRequest.virtualIbanId !== virtualIban.id) {
    console.error('❌ TopUp request is for a different Virtual IBAN');
    process.exit(1);
  }

  if (topUpRequest.status !== 'PENDING') {
    console.error('❌ TopUp request is not pending:', topUpRequest.status);
    process.exit(1);
  }

  console.log('\n✅ TopUp request found:', {
    reference: topUpRequest.reference,
    invoiceNumber: topUpRequest.invoiceNumber,
    amount: topUpRequest.amount,
    currency: topUpRequest.currency,
    status: topUpRequest.status,
    expiresAt: topUpRequest.expiresAt,
  });

  // 3. Simulate webhook payload (BCB v3 API format - Services API format)
  const webhookPayload = {
    tx_id: `sim-tx-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    account_id: virtualIban.providerAccountId,
    value_date: new Date().toISOString(),
    credit: 1, // 1 = incoming payment (CREDIT), 0 = outgoing (DEBIT)
    details: {
      iban: 'DK1234567890123456',
      bic: 'TESTDKKK',
      account_name: 'Test Sender',
      reference: reference, // ⬅️ This will match TopUpRequest
      counterparty_reference: reference,
    },
    ticker: 'EUR',
    amount: amount,
    approved: 1,
    notes: `Simulated top-up payment via ${reference}`,
    source_name: 'simulation',
  };

  console.log('\n📤 Simulating webhook call...\n');
  console.log('Payload:', JSON.stringify(webhookPayload, null, 2));

  // 4. Call webhook endpoint
  const webhookUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const response = await fetch(`${webhookUrl}/api/webhooks/bcb/virtual-iban`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(webhookPayload),
  });

  const result = await response.json();

  console.log('\n📥 Webhook response:', {
    status: response.status,
    result: JSON.stringify(result, null, 2),
  });

  if (response.ok && result.success) {
    console.log('\n✅ Payment simulation successful!');
    
    // Check updated balance
    const updatedVirtualIban = await prisma.virtualIbanAccount.findUnique({
      where: { id: virtualIban.id },
    });

    const updatedTopUpRequest = await prisma.topUpRequest.findUnique({
      where: { id: topUpRequest.id },
    });

    console.log('\n📊 Updated state:');
    console.log('  Balance:', {
      before: virtualIban.balance,
      after: updatedVirtualIban?.balance,
      change: (updatedVirtualIban?.balance || 0) - virtualIban.balance,
    });
    console.log('  TopUp request status:', {
      before: topUpRequest.status,
      after: updatedTopUpRequest?.status,
    });
  } else {
    console.error('\n❌ Payment simulation failed');
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

