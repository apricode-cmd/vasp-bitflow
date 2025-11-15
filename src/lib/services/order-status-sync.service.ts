/**
 * Order Status Synchronization Service
 * 
 * Синхронизирует статусы Order с PayIn и PayOut согласно финансовой архитектуре
 */

import { prisma } from '@/lib/prisma';

export type OrderStatus = 
  | 'PENDING' 
  | 'PAYMENT_PENDING' 
  | 'PAYMENT_RECEIVED' 
  | 'PROCESSING' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'EXPIRED'
  | 'REFUNDED'
  | 'FAILED';

export type PayInStatus = 
  | 'PENDING' 
  | 'RECEIVED' 
  | 'VERIFIED' 
  | 'PARTIAL' 
  | 'MISMATCH' 
  | 'RECONCILED' 
  | 'FAILED' 
  | 'REFUNDED' 
  | 'EXPIRED';

export type PayOutStatus = 
  | 'PENDING' 
  | 'QUEUED' 
  | 'PROCESSING' 
  | 'SENT' 
  | 'CONFIRMING' 
  | 'CONFIRMED' 
  | 'FAILED' 
  | 'CANCELLED';

/**
 * Определяет статус заказа на основе PayIn статуса
 */
export function getOrderStatusFromPayIn(payInStatus: PayInStatus): OrderStatus | null {
  switch (payInStatus) {
    case 'RECEIVED':
      return 'PAYMENT_RECEIVED';
    case 'VERIFIED':
      return 'PROCESSING';
    case 'FAILED':
      return 'FAILED';
    case 'REFUNDED':
      return 'REFUNDED';
    case 'EXPIRED':
      return 'CANCELLED';
    default:
      return null; // Не меняем статус для остальных
  }
}

/**
 * Определяет статус заказа на основе PayOut статуса
 */
export function getOrderStatusFromPayOut(payOutStatus: PayOutStatus): OrderStatus | null {
  console.log(`🔍 [Order Sync] Determining order status from PayOut status: ${payOutStatus}`);
  
  switch (payOutStatus) {
    case 'SENT':
    case 'CONFIRMING':
      console.log(`  → Will set order to PROCESSING`);
      return 'PROCESSING'; // Крипта отправлена, ждем подтверждений
    case 'CONFIRMED':
      console.log(`  → Will set order to COMPLETED`);
      return 'COMPLETED'; // Транзакция подтверждена в blockchain
    case 'FAILED':
      console.log(`  → Will set order to FAILED`);
      return 'FAILED';
    case 'CANCELLED':
      console.log(`  → Will set order to CANCELLED`);
      return 'CANCELLED';
    default:
      console.log(`  → No order status change (PayOut status: ${payOutStatus})`);
      return null; // Не меняем статус для PENDING, QUEUED, PROCESSING
  }
}

/**
 * Синхронизирует статус Order при создании PayIn
 */
export async function syncOrderOnPayInCreate(orderId: string, payInStatus: PayInStatus): Promise<void> {
  const newOrderStatus = getOrderStatusFromPayIn(payInStatus);
  
  if (newOrderStatus) {
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        status: newOrderStatus,
        updatedAt: new Date()
      }
    });
    
    console.log(`✅ [Order Sync] Order ${orderId} status updated to ${newOrderStatus} (PayIn created with ${payInStatus})`);
  }
}

/**
 * Синхронизирует статус Order при обновлении PayIn
 */
export async function syncOrderOnPayInUpdate(
  orderId: string, 
  oldStatus: PayInStatus, 
  newStatus: PayInStatus
): Promise<void> {
  // Только если статус реально изменился
  if (oldStatus === newStatus) {
    return;
  }

  const newOrderStatus = getOrderStatusFromPayIn(newStatus);
  
  if (newOrderStatus) {
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        status: newOrderStatus,
        updatedAt: new Date()
      }
    });
    
    console.log(`✅ [Order Sync] Order ${orderId} status updated to ${newOrderStatus} (PayIn: ${oldStatus} → ${newStatus})`);
  }
}

/**
 * Синхронизирует статус Order при создании PayOut
 */
export async function syncOrderOnPayOutCreate(orderId: string, payOutStatus: PayOutStatus): Promise<void> {
  const newOrderStatus = getOrderStatusFromPayOut(payOutStatus);
  
  if (newOrderStatus) {
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        status: newOrderStatus,
        updatedAt: new Date()
      }
    });
    
    console.log(`✅ [Order Sync] Order ${orderId} status updated to ${newOrderStatus} (PayOut created with ${payOutStatus})`);
  }
}

/**
 * Синхронизирует статус Order при обновлении PayOut
 */
export async function syncOrderOnPayOutUpdate(
  orderId: string, 
  oldStatus: PayOutStatus, 
  newStatus: PayOutStatus
): Promise<void> {
  console.log(`\n🔄 [Order Sync] syncOrderOnPayOutUpdate called:`);
  console.log(`   Order ID: ${orderId}`);
  console.log(`   Old PayOut Status: ${oldStatus}`);
  console.log(`   New PayOut Status: ${newStatus}`);
  
  // Только если статус реально изменился
  if (oldStatus === newStatus) {
    console.log(`   ⏭️  Status unchanged, skipping sync`);
    return;
  }

  const newOrderStatus = getOrderStatusFromPayOut(newStatus);
  
  if (newOrderStatus) {
    console.log(`   📝 Updating order ${orderId} to ${newOrderStatus}`);
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        status: newOrderStatus,
        updatedAt: new Date()
      }
    });
    
    console.log(`✅ [Order Sync] Order ${orderId} status updated to ${newOrderStatus} (PayOut: ${oldStatus} → ${newStatus})\n`);
  } else {
    console.log(`   ℹ️  No order status change needed for PayOut status: ${newStatus}\n`);
  }
}

/**
 * Умная синхронизация: учитывает оба PayIn и PayOut
 * Используется когда нужно определить статус на основе обоих
 */
export async function syncOrderSmart(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payIn: true,
      payOut: true
    }
  });

  if (!order) {
    console.error(`❌ [Order Sync] Order ${orderId} not found`);
    return;
  }

  let newStatus: OrderStatus | null = null;

  // Приоритет определения статуса:
  // 1. Если есть PayOut CONFIRMED → COMPLETED
  // 2. Если есть PayOut SENT/CONFIRMING → PROCESSING
  // 3. Если есть PayOut FAILED/CANCELLED → FAILED/CANCELLED
  // 4. Если есть PayIn VERIFIED → PROCESSING
  // 5. Если есть PayIn RECEIVED → PAYMENT_RECEIVED
  // 6. Если есть PayIn FAILED/REFUNDED → FAILED/REFUNDED

  if (order.payOut) {
    const payOutStatus = getOrderStatusFromPayOut(order.payOut.status as PayOutStatus);
    if (payOutStatus) {
      newStatus = payOutStatus;
    }
  }

  if (!newStatus && order.payIn) {
    const payInStatus = getOrderStatusFromPayIn(order.payIn.status as PayInStatus);
    if (payInStatus) {
      newStatus = payInStatus;
    }
  }

  if (newStatus && newStatus !== order.status) {
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        status: newStatus,
        updatedAt: new Date()
      }
    });
    
    console.log(`✅ [Order Sync] Order ${orderId} smart sync: ${order.status} → ${newStatus}`);
  }
}

