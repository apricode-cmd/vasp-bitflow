# Notification System - Implementation Status

## ✅ Phase 1: Database Foundation (COMPLETED)

### Database Schema
- ✅ `NotificationEvent` - система событий (17 events seeded)
- ✅ `NotificationQueue` - очередь для асинхронной отправки
- ✅ `NotificationHistory` - история уведомлений (для in-app)
- ✅ `NotificationSubscription` - настройки пользователя

### Enums
- ✅ `EventCategory` - ORDER, KYC, PAYMENT, SECURITY, SYSTEM, ADMIN, MARKETING
- ✅ `EventPriority` - LOW, NORMAL, HIGH, URGENT
- ✅ `NotificationChannel` - EMAIL, IN_APP, SMS, PUSH
- ✅ `QueueStatus` - PENDING, PROCESSING, SENT, FAILED, CANCELLED, SKIPPED
- ✅ `NotificationFrequency` - INSTANT, HOURLY, DAILY, WEEKLY

### Seeded Events (17 total)
**ORDER (4):**
- ORDER_CREATED
- ORDER_PAYMENT_RECEIVED
- ORDER_COMPLETED
- ORDER_CANCELLED

**KYC (4):**
- KYC_SUBMITTED
- KYC_APPROVED
- KYC_REJECTED
- KYC_DOCUMENTS_REQUIRED

**PAYMENT (3):**
- PAYMENT_PENDING
- PAYMENT_CONFIRMED
- PAYMENT_FAILED

**SECURITY (4):**
- SECURITY_LOGIN
- SECURITY_PASSWORD_CHANGED
- SECURITY_2FA_ENABLED
- SECURITY_SUSPICIOUS_ACTIVITY

**SYSTEM (2):**
- SYSTEM_MAINTENANCE
- SYSTEM_UPDATE

---

## ✅ Phase 2: Core Services (COMPLETED)

### NotificationService
**Location:** `src/lib/services/notification.service.ts`

**Features:**
- ✅ `send()` - Send notification for specific event
- ✅ `getUnreadNotifications()` - Get user's unread notifications
- ✅ `getNotificationHistory()` - Get user's notification history with filters
- ✅ `markAsRead()` - Mark notification as read
- ✅ `markAllAsRead()` - Mark all notifications as read
- ✅ `getUnreadCount()` - Get unread count
- ✅ `updatePreferences()` - Update user notification preferences
- ✅ `getUserPreferences()` - Get user preferences for all events
- ✅ `processPendingNotifications()` - Process pending notifications (for cron/worker)
- ✅ User preference filtering (email/in-app/sms/push enabled)
- ✅ Quiet hours support (structure ready)
- ✅ Channel routing (EMAIL, IN_APP, SMS, PUSH)
- ✅ Retry mechanism (max 3 attempts)

### EventEmitter Service
**Location:** `src/lib/services/event-emitter.service.ts`

**Features:**
- ✅ `emit()` - Emit event and trigger notifications
- ✅ `emitBatch()` - Emit multiple events in batch
- ✅ Content generation for all 17 seeded events
- ✅ Automatic notification data formatting
- ✅ Action URL generation for in-app navigation

**Content Generators:**
- ✅ ORDER_CREATED - "Order #X Created"
- ✅ ORDER_PAYMENT_RECEIVED - "Payment Received"
- ✅ ORDER_COMPLETED - "Order Completed"
- ✅ ORDER_CANCELLED - "Order Cancelled"
- ✅ KYC_SUBMITTED - "KYC Verification Submitted"
- ✅ KYC_APPROVED - "KYC Verification Approved"
- ✅ KYC_REJECTED - "KYC Verification Rejected"
- ✅ KYC_DOCUMENTS_REQUIRED - "Additional Documents Required"
- ✅ PAYMENT_PENDING - "Payment Pending Confirmation"
- ✅ PAYMENT_CONFIRMED - "Payment Confirmed"
- ✅ PAYMENT_FAILED - "Payment Failed"
- ✅ SECURITY_LOGIN - "New Login Detected"
- ✅ SECURITY_PASSWORD_CHANGED - "Password Changed"
- ✅ SECURITY_2FA_ENABLED - "2FA Enabled"
- ✅ SECURITY_SUSPICIOUS_ACTIVITY - "Suspicious Activity Detected"
- ✅ SYSTEM_MAINTENANCE - "Scheduled Maintenance"
- ✅ SYSTEM_UPDATE - "New Features Available"

---

## ✅ Phase 3: API Endpoints (COMPLETED)

### Client API
**Base:** `/api/notifications`

- ✅ `GET /api/notifications` - Get user's notifications
  - Query params: `limit`, `offset`, `eventKey`, `isRead`
  - Returns: notifications + unreadCount + pagination
  
- ✅ `POST /api/notifications/[id]/read` - Mark notification as read
  
- ✅ `POST /api/notifications/mark-all-read` - Mark all as read
  
- ✅ `GET /api/notifications/preferences` - Get user preferences
  
- ✅ `PUT /api/notifications/preferences` - Update user preferences
  - Body: `eventKey`, `emailEnabled`, `inAppEnabled`, `smsEnabled`, `pushEnabled`, `frequency`, `quietHours`

---

## ✅ Phase 4: Integration Example (COMPLETED)

### Order Creation Integration
**Location:** `src/app/api/orders/route.ts`

**Implementation:**
```typescript
import { eventEmitter } from '@/lib/services/event-emitter.service';

// After order creation
await eventEmitter.emit('ORDER_CREATED', {
  userId,
  orderId: order.id,
  amount: order.totalFiat,
  currency: order.fiatCurrencyCode,
});
```

**Flow:**
1. User creates order
2. Order saved to database
3. Event emitted: `ORDER_CREATED`
4. EventEmitter generates notification content
5. NotificationService:
   - Checks user preferences
   - Filters channels (email/in-app enabled?)
   - Creates queue entries for each channel
   - For IN_APP: creates history entry immediately
6. Queue processor (cron) sends EMAIL/SMS/PUSH

---

## 📋 Next Steps (Phase 5+)

### Phase 5: Email Integration (TODO)
- [ ] Integrate with Resend provider
- [ ] Create email templates (HTML)
- [ ] Update `sendEmail()` in NotificationService
- [ ] Test email delivery

### Phase 6: UI Components (TODO)
- [ ] Notification Bell component (Header)
- [ ] Notification Dropdown (unread list)
- [ ] Notification Center page (full history)
- [ ] Notification Preferences page (settings)
- [ ] Toast notifications for real-time updates

### Phase 7: Admin Panel (TODO)
- [ ] Admin notification events management
- [ ] Admin notification queue monitoring
- [ ] Admin notification history/analytics
- [ ] Manual notification sending

### Phase 8: Advanced Features (TODO)
- [ ] SMS integration (Twilio)
- [ ] Push notifications (Firebase/OneSignal)
- [ ] Notification digests (hourly/daily/weekly)
- [ ] Quiet hours timezone support
- [ ] Notification templates (customizable)
- [ ] A/B testing for notifications
- [ ] Notification analytics

---

## 🔧 How to Use

### 1. Emit Event in Your Code
```typescript
import { eventEmitter } from '@/lib/services/event-emitter.service';

// Example: KYC Approved
await eventEmitter.emit('KYC_APPROVED', {
  userId: 'user123',
  kycSessionId: 'kyc456',
});

// Example: Order Completed
await eventEmitter.emit('ORDER_COMPLETED', {
  userId: 'user123',
  orderId: 'order789',
  cryptoAmount: 0.5,
  cryptoCurrency: 'BTC',
  walletAddress: 'bc1q...',
  txHash: '0x...',
});
```

### 2. Get User Notifications (Frontend)
```typescript
// Get unread notifications
const response = await fetch('/api/notifications?isRead=false&limit=10');
const { notifications, unreadCount } = await response.json();

// Mark as read
await fetch(`/api/notifications/${notificationId}/read`, { method: 'POST' });

// Mark all as read
await fetch('/api/notifications/mark-all-read', { method: 'POST' });
```

### 3. Update User Preferences
```typescript
await fetch('/api/notifications/preferences', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eventKey: 'ORDER_CREATED',
    emailEnabled: true,
    inAppEnabled: true,
    smsEnabled: false,
    frequency: 'INSTANT',
  }),
});
```

### 4. Process Queue (Cron Job)
```typescript
// In your cron job (e.g., every minute)
import { notificationService } from '@/lib/services/notification.service';

await notificationService.processPendingNotifications(100);
```

---

## 📊 Database Queries

### Get Unread Count
```sql
SELECT COUNT(*) FROM "NotificationHistory" 
WHERE "userId" = 'user123' AND "isRead" = false;
```

### Get Pending Queue Items
```sql
SELECT * FROM "NotificationQueue" 
WHERE "status" = 'PENDING' 
AND "scheduledFor" <= NOW() 
AND "attempts" < "maxAttempts"
ORDER BY "scheduledFor" ASC
LIMIT 100;
```

### Get User Preferences
```sql
SELECT * FROM "NotificationSubscription" 
WHERE "userId" = 'user123';
```

---

## 🎯 Key Features

### ✅ Implemented
- Event-driven architecture
- Multi-channel support (EMAIL, IN_APP, SMS, PUSH)
- User preferences per event
- Quiet hours support (structure)
- Retry mechanism (3 attempts)
- Queue-based async processing
- In-app notification history
- Unread count tracking
- Mark as read functionality
- Notification frequency (INSTANT, HOURLY, DAILY, WEEKLY)
- 17 pre-configured events
- Content generation for all events
- Action URLs for navigation
- API endpoints for client integration
- Integration example (Order Creation)

### 🔄 In Progress
- Email provider integration (Resend)
- UI components
- Admin panel

### 📅 Planned
- SMS provider integration (Twilio)
- Push notifications (Firebase)
- Notification templates
- Digest notifications
- Timezone-aware quiet hours
- Analytics

---

## 📝 Notes

### Architecture Decisions
1. **Event-Driven:** Business logic emits events, notification system reacts
2. **Queue-Based:** Async processing for reliability and scalability
3. **Channel-Agnostic:** Easy to add new channels (SMS, Push, etc.)
4. **User-Centric:** Full control over preferences per event
5. **Fail-Safe:** Retry mechanism + error logging
6. **Extensible:** Easy to add new events and content generators

### Security Considerations
- ✅ User ID validation in all API endpoints
- ✅ User can only read/update their own notifications
- ✅ Preferences validated with Zod schemas
- ✅ Queue processing isolated from user requests

### Performance Considerations
- ✅ Pagination for notification history
- ✅ Indexes on userId, isRead, createdAt
- ✅ Queue processing in batches (100 at a time)
- ✅ IN_APP notifications created immediately (no queue delay)

---

## 🚀 Deployment Checklist

### Before Production
- [ ] Set up cron job for queue processing (every 1-5 minutes)
- [ ] Configure email provider (Resend API key)
- [ ] Test all notification events
- [ ] Test user preferences
- [ ] Test retry mechanism
- [ ] Monitor queue size
- [ ] Set up alerts for failed notifications
- [ ] Create UI components
- [ ] Update user documentation

### Environment Variables
```env
# Email Provider (Resend)
RESEND_API_KEY=re_...

# SMS Provider (Twilio) - Optional
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...

# Push Notifications (Firebase) - Optional
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
```

---

**Status:** Phase 1-4 Complete ✅  
**Next:** Phase 5 - Email Integration  
**Updated:** 2025-11-10

