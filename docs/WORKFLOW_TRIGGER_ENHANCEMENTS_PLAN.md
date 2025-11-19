# Workflow Trigger Enhancements Plan

## 🎯 Проблема

Текущие триггеры **слишком простые** - срабатывают на любое событие без фильтрации.

**Сейчас:**
```
ORDER_CREATED → срабатывает на ЛЮБОЙ заказ
```

**Нужно:**
```
ORDER_CREATED → только если:
  - Сумма > 10000 EUR
  - ИЛИ Страна в [RU, BY, KP]
  - ИЛИ Первый заказ пользователя
  - ИЛИ KYC не APPROVED
```

---

## 📋 План расширения Trigger Configuration

### 1. **ORDER_CREATED** Trigger

#### Доступные фильтры:

| Filter Group | Field | Type | Operators | Example | Description |
|-------------|-------|------|-----------|---------|-------------|
| **Amount** | `fiatAmount` | number | `>`, `<`, `>=`, `<=`, `==`, `!=`, `between` | `>= 10000` | Фиатная сумма |
| | `cryptoAmount` | number | Same | `>= 0.5` | Крипто сумма |
| | `totalFiat` | number | Same | `> 50000` | Итоговая сумма с комиссией |
| **Currency** | `fiatCurrency` | select | `==`, `!=`, `in`, `not_in` | `in [EUR, USD]` | Фиат валюта |
| | `currency` | select | Same | `in [BTC, ETH]` | Крипто валюта |
| **Status** | `status` | select | `==`, `!=`, `in` | `== PENDING` | Текущий статус |
| **User** | `user.kycStatus` | select | `==`, `!=` | `!= APPROVED` | KYC статус |
| | `user.country` | select | `in`, `not_in` | `in [RU, BY]` | Страна пользователя |
| | `user.email` | string | `contains`, `not_contains`, `matches` | `contains @temp-mail` | Email |
| | `user.registeredDays` | number | `<`, `>`, `<=`, `>=` | `< 30` | Дней с регистрации |
| | `user.totalOrders` | number | Same | `== 0` | Количество заказов |
| | `user.totalVolume` | number | Same | `< 1000` | Общий объем транзакций |
| **Payment** | `paymentMethod` | select | `==`, `in` | `in [SEPA, SWIFT]` | Метод оплаты |
| **Time** | `createdAt.hour` | number | `between` | `between [0, 6]` | Час создания (ночные заказы) |
| | `createdAt.day` | select | `in` | `in [SAT, SUN]` | День недели (выходные) |
| **Risk** | `isFirstOrder` | boolean | `==` | `== true` | Первый заказ |
| | `isHighValue` | boolean | `==` | `== true` | > 10000 EUR (динамический) |
| | `createdByAdmin` | boolean | `==` | `== false` | Создан не админом |

#### Пример конфигурации:

```json
{
  "trigger": "ORDER_CREATED",
  "config": {
    "filters": [
      {
        "field": "fiatAmount",
        "operator": ">",
        "value": 10000,
        "logicOperator": "OR"
      },
      {
        "field": "user.country",
        "operator": "in",
        "value": ["RU", "BY", "KP", "IR"],
        "logicOperator": "OR"
      },
      {
        "field": "user.kycStatus",
        "operator": "!=",
        "value": "APPROVED",
        "logicOperator": "OR"
      },
      {
        "field": "isFirstOrder",
        "operator": "==",
        "value": true
      }
    ],
    "logic": "ANY" // ANY (OR) or ALL (AND)
  }
}
```

---

### 2. **PAYIN_RECEIVED** Trigger

#### Доступные фильтры:

| Filter Group | Field | Type | Operators | Example | Description |
|-------------|-------|------|-----------|---------|-------------|
| **Amount** | `amount` | number | `>`, `<`, `between` | `> 5000` | Сумма платежа |
| | `expectedAmount` | number | Same | - | Ожидаемая сумма |
| | `amountMismatch` | number | `>`, `<` | `> 100` | Разница с ожидаемой |
| **Status** | `status` | select | `==`, `in` | `in [PARTIAL, MISMATCH]` | Статус PayIn |
| **Matching** | `matchedToOrder` | boolean | `==` | `== false` | Не привязан к заказу |
| | `reconciliationStatus` | select | `==` | `== FAILED` | Статус reconciliation |
| **Source** | `sourceAccount` | string | `==`, `contains` | - | Банковский счет отправителя |
| | `senderName` | string | `contains`, `matches` | - | Имя отправителя |
| **Time** | `delayFromExpected` | number | `>` | `> 24` | Задержка (часы) |
| | `receivedAt.hour` | number | `between` | `[0, 6]` | Получено ночью |

#### Use Cases:

1. **Несоответствие суммы:**
   ```
   amountMismatch > 100 AND status == MISMATCH
   → FLAG_FOR_REVIEW
   ```

2. **Ночные платежи:**
   ```
   receivedAt.hour between [0, 6] AND amount > 5000
   → REQUIRE_APPROVAL
   ```

3. **Не привязанные платежи:**
   ```
   matchedToOrder == false
   → SEND_NOTIFICATION (COMPLIANCE)
   ```

---

### 3. **PAYOUT_REQUESTED** Trigger

#### Доступные фильтры:

| Filter Group | Field | Type | Operators | Example | Description |
|-------------|-------|------|-----------|---------|-------------|
| **Amount** | `cryptoAmount` | number | `>`, `<`, `between` | `> 10` | BTC сумма |
| | `fiatEquivalent` | number | Same | `> 50000` | Эквивалент в фиате |
| **Destination** | `toAddress` | string | `==`, `in`, `matches` | - | Адрес получателя |
| | `isNewAddress` | boolean | `==` | `== true` | Новый адрес |
| | `addressVerified` | boolean | `==` | `== false` | Адрес не верифицирован |
| **User** | `user.kycStatus` | select | `!=` | `!= APPROVED` | KYC не одобрен |
| | `user.totalPayouts` | number | `<` | `< 5` | Количество выводов |
| | `user.lastPayoutDays` | number | `<` | `< 1` | Дней с последнего вывода |
| **Risk** | `isFirstPayout` | boolean | `==` | `== true` | Первый вывод |
| | `velocityAlert` | boolean | `==` | `== true` | Частые выводы |
| **Blockchain** | `blockchain` | select | `in` | `in [BTC, ETH]` | Блокчейн |
| | `estimatedFee` | number | `>` | `> 50` | Высокая комиссия сети |

#### Use Cases:

1. **Первый вывод:**
   ```
   isFirstPayout == true OR user.totalPayouts < 3
   → REQUIRE_APPROVAL (COMPLIANCE)
   ```

2. **Новый адрес + крупная сумма:**
   ```
   isNewAddress == true AND cryptoAmount > 5
   → FREEZE_ORDER + REQUEST_DOCUMENT (proof of address ownership)
   ```

3. **Velocity check:**
   ```
   user.lastPayoutDays < 1 AND velocityAlert == true
   → ESCALATE_TO_COMPLIANCE
   ```

---

### 4. **KYC_SUBMITTED** Trigger

#### Доступные фильтры:

| Filter Group | Field | Type | Operators | Example | Description |
|-------------|-------|------|-----------|---------|-------------|
| **User** | `user.country` | select | `in`, `not_in` | `in [US, CA]` | Страна |
| | `user.registeredDays` | number | `<` | `< 1` | Новый пользователь |
| | `user.hasOrders` | boolean | `==` | `== true` | Есть заказы |
| **Document** | `documentType` | select | `in` | `in [PASSPORT, ID_CARD]` | Тип документа |
| | `hasAddress` | boolean | `==` | `== true` | Есть proof of address |
| | `hasVideoVerification` | boolean | `==` | `== false` | Нет видео |
| **Risk** | `isResubmission` | boolean | `==` | `== true` | Повторная подача |
| | `attemptNumber` | number | `>` | `> 2` | Попытка № |
| | `previousRejectionReason` | select | `in` | `in [UNSATISFACTORY_PHOTOS]` | Причина прошлого отклонения |
| **Data** | `email` | string | `contains`, `matches` | `matches @(temp-mail|guerrilla)` | Временный email |
| | `age` | number | `<`, `>` | `< 18` | Возраст |
| | `placeOfBirth` | select | `in` | `in [RU, BY]` | Место рождения |

#### Use Cases:

1. **High-risk страны:**
   ```
   user.country in [RU, BY, KP, IR, SY]
   → REQUIRE_APPROVAL (COMPLIANCE) + REQUEST_DOCUMENT (proof of funds)
   ```

2. **Несовершеннолетние:**
   ```
   age < 18
   → REJECT_TRANSACTION (reason: "Age restriction")
   ```

3. **Повторная подача:**
   ```
   isResubmission == true AND attemptNumber > 2
   → ESCALATE_TO_COMPLIANCE
   ```

4. **Temp email:**
   ```
   email matches @(temp-mail|guerrilla|10minutemail)
   → FLAG_FOR_REVIEW
   ```

---

### 5. **USER_REGISTERED** Trigger

#### Доступные фильтры:

| Filter Group | Field | Type | Operators | Example | Description |
|-------------|-------|------|-----------|---------|-------------|
| **User** | `email` | string | `contains`, `matches`, `ends_with` | `ends_with @company.com` | Email домен |
| | `country` | select | `in`, `not_in` | `in [US, EU]` | Страна |
| | `phoneCountry` | select | Same | - | Страна телефона |
| **Time** | `registeredAt.hour` | number | `between` | `[0, 6]` | Час регистрации |
| | `registeredAt.day` | select | `in` | `in [SAT, SUN]` | День недели |
| **Risk** | `phoneCountryMismatch` | boolean | `==` | `== true` | Телефон != страна профиля |
| | `suspiciousPattern` | boolean | `==` | `== true` | ML модель детектор |
| **Source** | `referralSource` | string | `==`, `in` | `in [organic, google]` | Источник трафика |
| | `utmCampaign` | string | `contains` | - | UTM метка |

#### Use Cases:

1. **B2B регистрации:**
   ```
   email ends_with @(company.com|business.net)
   → SEND_NOTIFICATION (SALES team)
   ```

2. **High-risk регистрации:**
   ```
   country in [RU, BY] OR phoneCountryMismatch == true
   → FLAG_FOR_REVIEW
   ```

3. **Ночные регистрации (боты):**
   ```
   registeredAt.hour between [2, 5] AND suspiciousPattern == true
   → REQUIRE_APPROVAL (before first order)
   ```

---

### 6. **WALLET_ADDED** Trigger

#### Доступные фильтры:

| Filter Group | Field | Type | Operators | Example | Description |
|-------------|-------|------|-----------|---------|-------------|
| **Wallet** | `blockchain` | select | `==`, `in` | `in [BTC, ETH]` | Блокчейн |
| | `currency` | select | Same | `== USDT` | Валюта |
| | `isVerified` | boolean | `==` | `== false` | Не верифицирован |
| | `isDefault` | boolean | `==` | `== true` | Установлен по умолчанию |
| **User** | `user.kycStatus` | select | `!=` | `!= APPROVED` | KYC не одобрен |
| | `user.walletCount` | number | `>` | `> 5` | Много кошельков |
| **Risk** | `addressRiskScore` | number | `>` | `> 0.7` | Скор риска (Chainalysis) |
| | `isMixerRelated` | boolean | `==` | `== true` | Связь с миксером |
| | `isSanctioned` | boolean | `==` | `== true` | В санкционном списке |

#### Use Cases:

1. **High-risk адреса:**
   ```
   addressRiskScore > 0.7 OR isMixerRelated == true
   → FREEZE_ORDER + ESCALATE_TO_COMPLIANCE
   ```

2. **Много кошельков:**
   ```
   user.walletCount > 10 AND user.kycStatus != APPROVED
   → FLAG_FOR_REVIEW
   ```

3. **Санкционные адреса:**
   ```
   isSanctioned == true
   → REJECT_TRANSACTION + SEND_NOTIFICATION (COMPLIANCE)
   ```

---

### 7. **AMOUNT_THRESHOLD** Trigger (Special)

Этот триггер **периодический** (cron-based), а не event-based.

#### Доступные фильтры:

| Filter Group | Field | Type | Operators | Example | Description |
|-------------|-------|------|-----------|---------|-------------|
| **Period** | `checkPeriod` | select | `==` | `== DAILY` | Период проверки |
| | `timeWindow` | select | `==` | `== 24H` | Временное окно |
| **Threshold** | `thresholdAmount` | number | `>` | `> 50000` | Лимит суммы |
| | `thresholdCurrency` | select | `==` | `== EUR` | Валюта лимита |
| | `aggregationType` | select | `==` | `== SUM` | Тип агрегации (SUM, COUNT, AVG) |
| **Scope** | `scopeType` | select | `==` | `== USER` | Scope (USER, COUNTRY, GLOBAL) |
| | `includeStatuses` | select | `in` | `in [COMPLETED, PROCESSING]` | Учитываемые статусы |

#### Use Cases:

1. **Daily volume limit:**
   ```
   checkPeriod == DAILY
   timeWindow == 24H
   thresholdAmount > 50000
   scopeType == USER
   → FREEZE_ORDER + REQUIRE_APPROVAL
   ```

2. **Unusual activity:**
   ```
   aggregationType == COUNT
   thresholdAmount > 10 (orders per day)
   → SEND_NOTIFICATION (COMPLIANCE)
   ```

---

## 🏗️ Архитектура изменений

### 1. Database Schema

Добавить поля в `Workflow` model:

```prisma
model Workflow {
  // ... existing fields
  
  // Trigger Configuration (NEW)
  triggerConfig Json? // Filter configuration
  
  // Example:
  // {
  //   "filters": [
  //     { "field": "fiatAmount", "operator": ">", "value": 10000 },
  //     { "field": "user.country", "operator": "in", "value": ["RU", "BY"] }
  //   ],
  //   "logic": "OR" // or "AND"
  // }
}
```

---

### 2. UI Components

#### A. **TriggerConfigPanel** (New Component)

```typescript
interface TriggerConfigPanelProps {
  trigger: WorkflowTrigger;
  config: TriggerConfig;
  onChange: (config: TriggerConfig) => void;
}

interface TriggerConfig {
  filters: FilterRule[];
  logic: 'AND' | 'OR';
}

interface FilterRule {
  field: string;
  operator: string;
  value: any;
  logicOperator?: 'AND' | 'OR'; // for chaining
}
```

#### B. **FilterBuilder** (New Component)

n8n-style filter builder:

```
┌─────────────────────────────────────────────────────┐
│ Trigger Filters (Apply when ALL/ANY match)         │
├─────────────────────────────────────────────────────┤
│ [AND/OR] Field         Operator      Value         │
│ [ AND ] [fiatAmount ▼] [>        ▼] [10000      ] │
│ [ OR  ] [user.country▼] [in      ▼] [RU,BY,KP  ] │
│ [ OR  ] [kycStatus   ▼] [!=      ▼] [APPROVED  ] │
│                                                     │
│ [+ Add Filter]                                      │
└─────────────────────────────────────────────────────┘
```

---

### 3. Trigger Node Updates

**TriggerNode.tsx:**
```typescript
export interface TriggerNodeData {
  trigger: string;
  config?: TriggerConfig; // NEW: filter config
  // ... existing fields
}

// Show filter count badge
{config?.filters?.length > 0 && (
  <Badge variant="secondary" className="text-xs">
    {config.filters.length} filter{config.filters.length > 1 ? 's' : ''}
  </Badge>
)}
```

---

### 4. Trigger Evaluation Engine

**src/lib/workflows/trigger/evaluateTrigger.ts:**

```typescript
export async function evaluateTrigger(
  trigger: WorkflowTrigger,
  config: TriggerConfig,
  contextData: any
): Promise<boolean> {
  if (!config?.filters || config.filters.length === 0) {
    return true; // No filters = always match
  }

  const results = await Promise.all(
    config.filters.map(filter => evaluateFilter(filter, contextData))
  );

  // Apply logic (AND/OR)
  return config.logic === 'AND'
    ? results.every(r => r)
    : results.some(r => r);
}

function evaluateFilter(
  filter: FilterRule,
  data: any
): boolean {
  const value = getNestedValue(data, filter.field); // e.g., "user.country"
  
  switch (filter.operator) {
    case '>': return value > filter.value;
    case '<': return value < filter.value;
    case '==': return value === filter.value;
    case 'in': return filter.value.includes(value);
    // ... more operators
  }
}
```

---

### 5. Integration Points

**Trigger events в коде:**

```typescript
// src/app/api/orders/create/route.ts
const order = await prisma.order.create({ data });

// Trigger workflows
await triggerWorkflows('ORDER_CREATED', {
  ...order,
  user: await prisma.user.findUnique({ where: { id: order.userId } }),
  isFirstOrder: await isFirstOrder(order.userId),
  isHighValue: order.fiatAmount > 10000,
});
```

---

## 📊 UI/UX Improvements

### 1. **Properties Panel - Trigger Section**

Добавить раздел для конфигурации триггера:

```
┌─────────────────────────────────────┐
│ Trigger Properties                  │
├─────────────────────────────────────┤
│ Type: ORDER_CREATED                 │
│ [Badge: 3 filters]                  │
│                                     │
│ [Configure Filters] →               │
│                                     │
│ Quick Preview:                      │
│ • fiatAmount > 10000                │
│ • country in [RU, BY]               │
│ • kycStatus != APPROVED             │
└─────────────────────────────────────┘
```

### 2. **Filter Dialog** (Modal)

Full-screen modal для настройки фильтров:

```
┌─────────────────────────────────────────────────────┐
│ Configure Trigger Filters - ORDER_CREATED       [X] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Run workflow when:                                  │
│ ( ) ALL conditions match (AND)                      │
│ (•) ANY condition matches (OR)                      │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Filters:                                        │ │
│ │ ┌─────────────────────────────────────────────┐ │ │
│ │ │ [OR] Amount                              [x]│ │ │
│ │ │ Field: [fiatAmount ▼]                       │ │ │
│ │ │ Operator: [> ▼]                             │ │ │
│ │ │ Value: [10000]                              │ │ │
│ │ └─────────────────────────────────────────────┘ │ │
│ │                                                 │ │
│ │ ┌─────────────────────────────────────────────┐ │ │
│ │ │ [OR] User Country                        [x]│ │ │
│ │ │ Field: [user.country ▼]                     │ │ │
│ │ │ Operator: [in ▼]                            │ │ │
│ │ │ Value: [RU, BY, KP] (multi-select)         │ │ │
│ │ └─────────────────────────────────────────────┘ │ │
│ │                                                 │ │
│ │ [+ Add Filter]                                  │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ [Cancel]                                    [Save] │
└─────────────────────────────────────────────────────┘
```

### 3. **Visual Indicator on Canvas**

Показывать на Trigger ноде, что есть фильтры:

```
┌─────────────────────────────┐
│ 🔔 TRIGGER                  │
│ Order Created               │
│ ┌─────────────────────────┐ │
│ │ 🎯 3 active filters     │ │
│ └─────────────────────────┘ │
│ • Amount > €10K             │
│ • High-risk countries       │
│ • KYC not approved          │
└─────────────────────────────┘
```

---

## 🚀 Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- [x] Database schema update (add `triggerConfig` JSON field)
- [ ] Zod validation schemas for `TriggerConfig`
- [ ] `FilterBuilder` component (basic)
- [ ] `evaluateTrigger` engine
- [ ] Unit tests for filter evaluation

### Phase 2: UI Components (Week 2)
- [ ] `TriggerConfigPanel` component
- [ ] Filter Dialog modal
- [ ] Integration with `PropertiesPanel`
- [ ] Visual indicators on `TriggerNode`
- [ ] Expression support in filter values

### Phase 3: Trigger-Specific Filters (Week 3)
- [ ] ORDER_CREATED filters
- [ ] PAYIN_RECEIVED filters
- [ ] PAYOUT_REQUESTED filters
- [ ] KYC_SUBMITTED filters
- [ ] USER_REGISTERED filters
- [ ] WALLET_ADDED filters

### Phase 4: Advanced Features (Week 4)
- [ ] AMOUNT_THRESHOLD (cron-based trigger)
- [ ] Risk scoring integration (Chainalysis)
- [ ] ML-based suspicious pattern detection
- [ ] Filter templates (pre-built common filters)
- [ ] Bulk testing of filters

### Phase 5: Integration & Testing (Week 5)
- [ ] Real workflow trigger integration
- [ ] Performance optimization
- [ ] Analytics dashboard (trigger match rate)
- [ ] Admin documentation
- [ ] User acceptance testing

---

## 📈 Success Metrics

### Key Performance Indicators:

1. **Trigger Accuracy:** % of workflows that trigger on correct events
2. **False Positive Rate:** % of workflows triggered unnecessarily
3. **Performance:** Trigger evaluation time (target: < 100ms)
4. **Adoption:** % of workflows using filters (target: > 80%)

### Example Scenarios:

**Before (without filters):**
- ORDER_CREATED → 100% of orders trigger workflow
- Manual review needed: 90% of orders
- Admin workload: HIGH

**After (with filters):**
- ORDER_CREATED with filters → 10% of orders trigger workflow
- Manual review needed: 10% of orders
- Admin workload: LOW
- False negatives: < 1%

---

## 🎯 Priority Matrix

| Trigger | Importance | Complexity | Priority | Est. Time |
|---------|-----------|------------|----------|-----------|
| ORDER_CREATED | 🔴 Critical | Medium | P0 | 3 days |
| KYC_SUBMITTED | 🔴 Critical | Medium | P0 | 2 days |
| PAYOUT_REQUESTED | 🟠 High | High | P1 | 4 days |
| PAYIN_RECEIVED | 🟠 High | High | P1 | 3 days |
| USER_REGISTERED | 🟡 Medium | Low | P2 | 2 days |
| WALLET_ADDED | 🟡 Medium | Medium | P2 | 2 days |
| AMOUNT_THRESHOLD | 🟢 Low | Very High | P3 | 5 days |

**Total Estimated Time:** ~3 weeks for P0-P1 triggers

---

## 💡 Best Practices

### 1. Filter Design

- ✅ Start with simple filters (1-2 conditions)
- ✅ Test filters before activating workflow
- ✅ Use expressions for dynamic values
- ❌ Avoid overly complex AND/OR chains (> 5 filters)

### 2. Performance

- ✅ Index fields used in filters (database)
- ✅ Cache frequently-checked values (e.g., country lists)
- ✅ Evaluate simple filters first (short-circuit)
- ❌ Don't make external API calls in filters (pre-compute)

### 3. Usability

- ✅ Provide filter templates for common scenarios
- ✅ Show example matches in UI
- ✅ Allow testing filters with historical data
- ❌ Don't hide complexity - make it transparent

---

## 🔗 Related Documentation

- `WORKFLOW_NODES_REFERENCE.md` - Node types
- `WORKFLOW_EXPRESSIONS_GUIDE.md` - Expression system
- `WORKFLOW_ENGINE_COMPLETE.md` - Engine overview

---

**Next Steps:**
1. Review and approve this plan
2. Prioritize triggers (suggest: ORDER_CREATED + KYC_SUBMITTED first)
3. Start with Phase 1 (Database + Core Engine)

**Estimated Total Time:** 5 weeks (with testing)

**Last Updated:** 2025-01-27

