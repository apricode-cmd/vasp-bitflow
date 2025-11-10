# Email Templates & Notifications System - Architecture

## 🎯 Цели системы

### 1. **White-Label Support**
- Шаблоны привязаны к организации/бренду
- Кастомизация цветов, логотипов, текстов
- Multi-tenant architecture

### 2. **Provider Flexibility**
- Поддержка multiple email провайдеров (Resend, SendGrid, AWS SES, Mailgun)
- Переключение провайдера без изменения кода
- Fallback mechanism

### 3. **Template Management**
- WYSIWYG редактор шаблонов в админке
- Версионирование шаблонов
- A/B тестирование
- Preview перед отправкой

### 4. **Notification System**
- Триггеры событий (order created, KYC approved, etc.)
- Очереди и retry mechanism
- Rate limiting
- Scheduled emails

---

## 📊 Database Schema

### EmailTemplate Model
```prisma
model EmailTemplate {
  id          String   @id @default(cuid())
  
  // Organization (white-label)
  orgId       String?  // null = global template
  
  // Template identification
  key         String   // 'welcome', 'order_created', 'kyc_approved'
  name        String   // "Welcome Email"
  description String?
  category    EmailCategory
  
  // Content
  subject     String   // "Welcome to {{platformName}}!"
  htmlContent String   @db.Text // HTML template with variables
  textContent String?  @db.Text // Plain text fallback
  
  // Design
  preheader   String?  // Email preview text
  layout      String   @default("default") // 'default', 'minimal', 'marketing'
  
  // Variables & Metadata
  variables   Json     // Required variables: ['userName', 'platformName']
  metadata    Json?    // Custom metadata
  
  // Versioning
  version     Int      @default(1)
  isActive    Boolean  @default(true)
  isDefault   Boolean  @default(false) // System default template
  
  // A/B Testing
  variantOf   String?  // Parent template ID for A/B test
  variantName String?  // "Variant A", "Variant B"
  
  // Status
  status      TemplateStatus @default(DRAFT)
  publishedAt DateTime?
  publishedBy String?
  
  // Audit
  createdBy   String
  updatedBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  notifications Notification[]
  emailLogs     EmailLog[]       @relation("TemplateUsed")
  
  @@unique([orgId, key, version])
  @@index([orgId, key])
  @@index([category])
  @@index([status])
  @@index([isActive])
}

enum EmailCategory {
  TRANSACTIONAL  // Order confirmations, receipts
  NOTIFICATION   // Status updates, alerts
  MARKETING      // Newsletters, promotions
  SYSTEM         // Password reset, email verification
  COMPLIANCE     // KYC updates, AML alerts
}

enum TemplateStatus {
  DRAFT
  REVIEW
  PUBLISHED
  ARCHIVED
}
```

### EmailProvider Model (Integration)
```prisma
model EmailProvider {
  id          String   @id @default(cuid())
  
  // Organization
  orgId       String?
  
  // Provider info
  providerId  String   // 'resend', 'sendgrid', 'ses', 'mailgun'
  name        String   // "Resend Production"
  description String?
  
  // Configuration
  config      Json     // API keys, settings (encrypted)
  
  // Sending limits
  dailyLimit  Int?     // Max emails per day
  rateLimit   Int?     // Max emails per second
  
  // Priority & Fallback
  priority    Int      @default(1) // 1 = primary, 2 = fallback
  isActive    Boolean  @default(true)
  isDefault   Boolean  @default(false)
  
  // Categories (which provider for which category)
  categories  EmailCategory[]
  
  // Stats
  sentToday   Int      @default(0)
  sentTotal   Int      @default(0)
  failedTotal Int      @default(0)
  lastUsedAt  DateTime?
  
  // Audit
  createdBy   String
  updatedBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  emailLogs   EmailLog[]
  
  @@unique([orgId, providerId])
  @@index([orgId, isActive])
  @@index([priority])
}
```

### Notification Model (Event → Email mapping)
```prisma
model Notification {
  id          String   @id @default(cuid())
  
  // Organization
  orgId       String?
  
  // Trigger
  eventType   String   // 'order.created', 'kyc.approved', 'user.registered'
  name        String   // "Order Created Notification"
  description String?
  
  // Template
  templateId  String
  template    EmailTemplate @relation(fields: [templateId], references: [id])
  
  // Recipients
  recipientType RecipientType // USER, ADMIN, CUSTOM
  customRecipients String[]    // For custom emails
  
  // Conditions
  conditions  Json?    // When to send: { "orderAmount": { "gt": 1000 } }
  
  // Timing
  sendDelay   Int?     // Delay in minutes (0 = immediate)
  sendAt      String?  // Cron expression for scheduled
  
  // Status
  isActive    Boolean  @default(true)
  priority    NotificationPriority @default(NORMAL)
  
  // Stats
  sentCount   Int      @default(0)
  failedCount Int      @default(0)
  lastSentAt  DateTime?
  
  // Audit
  createdBy   String
  updatedBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  queue       NotificationQueue[]
  
  @@unique([orgId, eventType])
  @@index([orgId, isActive])
  @@index([eventType])
}

enum RecipientType {
  USER         // Send to user who triggered event
  ADMIN        // Send to all admins
  COMPLIANCE   // Send to compliance team
  CUSTOM       // Send to specific emails
}

enum NotificationPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}
```

### NotificationQueue Model (Queue for sending)
```prisma
model NotificationQueue {
  id            String   @id @default(cuid())
  
  // Organization
  orgId         String?
  
  // Notification
  notificationId String
  notification   Notification @relation(fields: [notificationId], references: [id])
  
  // Recipient
  recipientEmail String
  recipientId    String?  // userId or adminId
  recipientType  String   // 'user', 'admin'
  
  // Template data
  templateId     String
  variables      Json     // Actual data for template
  
  // Provider
  providerId     String?
  
  // Status
  status         QueueStatus @default(PENDING)
  attempts       Int         @default(0)
  maxAttempts    Int         @default(3)
  
  // Timing
  scheduledFor   DateTime    @default(now())
  sentAt         DateTime?
  failedAt       DateTime?
  
  // Result
  messageId      String?     // Provider's message ID
  error          String?
  errorDetails   Json?
  
  // Metadata
  metadata       Json?
  
  // Timestamps
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  
  // Relations
  emailLog       EmailLog?
  
  @@index([status, scheduledFor])
  @@index([recipientEmail])
  @@index([notificationId])
  @@index([orgId, status])
}

enum QueueStatus {
  PENDING
  PROCESSING
  SENT
  FAILED
  CANCELLED
}
```

### EmailLog Model (Updated)
```prisma
model EmailLog {
  id          String      @id @default(cuid())
  
  // Organization
  orgId       String?
  
  // Recipient
  userId      String?
  user        User?       @relation(fields: [userId], references: [id])
  recipient   String      // Email address
  
  // Template
  templateId  String?
  template    EmailTemplate? @relation("TemplateUsed", fields: [templateId], references: [id])
  
  // Provider
  providerId  String?
  provider    EmailProvider? @relation(fields: [providerId], references: [id])
  
  // Queue
  queueId     String?     @unique
  queue       NotificationQueue? @relation(fields: [queueId], references: [id])
  
  // Content
  subject     String
  htmlContent String?     @db.Text
  textContent String?     @db.Text
  
  // Status
  status      EmailStatus @default(PENDING)
  sentAt      DateTime?
  deliveredAt DateTime?
  openedAt    DateTime?   // If tracking enabled
  clickedAt   DateTime?   // If tracking enabled
  failedAt    DateTime?
  
  // Result
  messageId   String?     // Provider's message ID
  error       String?
  errorCode   String?
  
  // Tracking
  opens       Int         @default(0)
  clicks      Int         @default(0)
  
  // Metadata
  metadata    Json?
  tags        String[]    // For filtering
  
  // Timestamps
  createdAt   DateTime    @default(now())
  
  @@index([userId])
  @@index([status])
  @@index([templateId])
  @@index([providerId])
  @@index([orgId, createdAt])
  @@index([recipient])
}
```

### BrandSettings Model (White-Label)
```prisma
model BrandSettings {
  id          String   @id @default(cuid())
  
  // Organization
  orgId       String   @unique
  
  // Brand Identity
  brandName   String   // "Apricode Exchange"
  companyName String   // "Apricode Ltd."
  
  // Visual
  logoUrl     String?
  faviconUrl  String?
  primaryColor String  @default("#3B82F6")
  secondaryColor String @default("#10B981")
  accentColor String  @default("#F59E0B")
  
  // Email Design
  emailLogoUrl String?
  emailHeaderColor String?
  emailFooterColor String?
  emailFont    String  @default("Arial, sans-serif")
  
  // Contact
  supportEmail String
  supportPhone String?
  website      String
  
  // Social
  facebook     String?
  twitter      String?
  linkedin     String?
  instagram    String?
  
  // Legal
  companyAddress String?
  companyRegNumber String?
  vatNumber    String?
  
  // Email Footer
  footerText   String? @db.Text
  unsubscribeText String?
  
  // Metadata
  metadata     Json?
  
  // Timestamps
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@index([orgId])
}
```

---

## 🏗️ Architecture Components

### 1. Template Engine Service
```typescript
// src/lib/services/template-engine.service.ts

interface TemplateRenderOptions {
  templateKey: string;
  orgId?: string;
  variables: Record<string, any>;
  locale?: string;
}

class TemplateEngineService {
  // Render template with variables
  async render(options: TemplateRenderOptions): Promise<{
    subject: string;
    html: string;
    text: string;
  }>;
  
  // Get template (with fallback to default)
  async getTemplate(key: string, orgId?: string): Promise<EmailTemplate>;
  
  // Validate template variables
  validateVariables(template: EmailTemplate, variables: Record<string, any>): boolean;
  
  // Preview template
  async preview(templateId: string, sampleData: Record<string, any>): Promise<string>;
}
```

### 2. Notification Service
```typescript
// src/lib/services/notification.service.ts

interface SendNotificationOptions {
  eventType: string;
  recipientEmail: string;
  recipientId?: string;
  variables: Record<string, any>;
  orgId?: string;
  priority?: NotificationPriority;
  scheduledFor?: Date;
}

class NotificationService {
  // Trigger notification by event
  async trigger(options: SendNotificationOptions): Promise<void>;
  
  // Send immediate email (bypass queue)
  async sendImmediate(options: SendNotificationOptions): Promise<void>;
  
  // Process queue
  async processQueue(): Promise<void>;
  
  // Retry failed
  async retryFailed(): Promise<void>;
}
```

### 3. Email Provider Manager
```typescript
// src/lib/services/email-provider-manager.service.ts

class EmailProviderManager {
  // Get active provider for category
  async getProvider(category: EmailCategory, orgId?: string): Promise<IEmailProvider>;
  
  // Send with fallback
  async sendWithFallback(params: EmailParams, category: EmailCategory): Promise<EmailSendResult>;
  
  // Check provider health
  async checkHealth(providerId: string): Promise<boolean>;
  
  // Get provider stats
  async getStats(providerId: string): Promise<ProviderStats>;
}
```

---

## 📧 Default Email Templates

### 1. **User Templates**
- `user.welcome` - Welcome email after registration
- `user.email_verification` - Email verification link
- `user.password_reset` - Password reset link
- `user.password_changed` - Password changed notification

### 2. **Order Templates**
- `order.created` - Order confirmation
- `order.payment_received` - Payment received
- `order.processing` - Order is being processed
- `order.completed` - Order completed with crypto sent
- `order.cancelled` - Order cancelled
- `order.expired` - Order expired

### 3. **KYC Templates**
- `kyc.started` - KYC verification started
- `kyc.documents_uploaded` - Documents uploaded
- `kyc.approved` - KYC approved
- `kyc.rejected` - KYC rejected with reason
- `kyc.additional_info_required` - Need more info

### 4. **Admin Templates**
- `admin.invited` - Admin invitation
- `admin.role_changed` - Role changed notification
- `admin.suspended` - Account suspended
- `admin.order_requires_approval` - Order needs approval
- `admin.kyc_requires_review` - KYC needs review

### 5. **System Templates**
- `system.maintenance` - Maintenance notification
- `system.security_alert` - Security alert
- `system.daily_report` - Daily summary report

---

## 🎨 Template Variables

### Global Variables (available in all templates)
```typescript
{
  // Brand
  platformName: string;
  platformUrl: string;
  logoUrl: string;
  supportEmail: string;
  supportPhone?: string;
  
  // Colors
  primaryColor: string;
  secondaryColor: string;
  
  // Social
  facebookUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  
  // Legal
  companyName: string;
  companyAddress: string;
  unsubscribeUrl?: string;
  
  // Date/Time
  currentYear: number;
  currentDate: string;
}
```

### Template-Specific Variables
```typescript
// order.created
{
  userName: string;
  orderId: string;
  orderNumber: string;
  cryptoAmount: string;
  cryptoCurrency: string;
  fiatAmount: string;
  fiatCurrency: string;
  exchangeRate: string;
  fee: string;
  totalAmount: string;
  walletAddress: string;
  paymentMethod: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    iban: string;
    swift: string;
    reference: string;
  };
  expiresAt: string;
  orderUrl: string;
}

// kyc.approved
{
  userName: string;
  kycLevel: string;
  approvedAt: string;
  limits: {
    daily: string;
    monthly: string;
  };
  dashboardUrl: string;
}
```

---

## 🔧 Implementation Plan

### Phase 1: Database & Models (Week 1)
- [ ] Create Prisma schema for all models
- [ ] Create migrations
- [ ] Seed default templates
- [ ] Seed default notifications

### Phase 2: Services (Week 2)
- [ ] TemplateEngineService
- [ ] NotificationService
- [ ] EmailProviderManager
- [ ] Queue processor (cron job)

### Phase 3: Admin UI (Week 3)
- [ ] Template management page
- [ ] WYSIWYG editor integration
- [ ] Template preview
- [ ] Provider management
- [ ] Notification configuration

### Phase 4: Integration (Week 4)
- [ ] Replace old email.ts with new system
- [ ] Add triggers to existing flows
- [ ] Testing & QA
- [ ] Documentation

---

## 🚀 Next Steps

1. **Review & Approve Architecture**
2. **Create Prisma Schema**
3. **Implement TemplateEngineService**
4. **Create Default Templates**
5. **Build Admin UI**

---

**Готовы начать реализацию?** 🎯

