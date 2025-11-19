# Workflow Engine - Nodes Reference

## 📋 Содержание
- [Обзор](#обзор)
- [Типы Нод](#типы-нод)
  - [1. Trigger Node (Триггер)](#1-trigger-node-триггер)
  - [2. Condition Node (Условие)](#2-condition-node-условие)
  - [3. Action Node (Действие)](#3-action-node-действие)
- [Примеры Workflow](#примеры-workflow)
- [Компиляция в JSON Logic](#компиляция-в-json-logic)
- [Статус Разработки](#статус-разработки)

---

## Обзор

Workflow Engine состоит из трех типов нод, которые соединяются в логические цепочки:

```
TRIGGER → CONDITION → ACTION
   ↓          ↓           ↓
 (Что?)   (Проверка?)  (Действие!)
```

### Ключевые особенности:
- ✅ **Visual Editor**: Drag & Drop интерфейс
- ✅ **Real-time Testing**: Проверка workflow с моковыми данными
- ✅ **Execution Visualization**: Анимация выполнения (как n8n)
- ✅ **JSON Logic Compilation**: Автоматическая компиляция графа
- ✅ **Double-Click Edit**: Быстрое редактирование нод
- ✅ **Theme Support**: Dark/Light режимы

---

## Типы Нод

### 1. Trigger Node (Триггер)

**Назначение:** Точка входа workflow - событие, которое запускает выполнение.

#### Доступные триггеры:

| Trigger Type | Label | Icon | Описание |
|-------------|-------|------|----------|
| `ORDER_CREATED` | Order Created | DollarSign | Создан новый заказ |
| `PAYIN_RECEIVED` | PayIn Received | TrendingUp | Получен входящий платеж |
| `PAYOUT_REQUESTED` | PayOut Requested | DollarSign | Запрошен вывод средств |
| `KYC_SUBMITTED` | KYC Submitted | FileCheck | Отправлена KYC заявка |
| `USER_REGISTERED` | User Registered | UserPlus | Зарегистрирован новый пользователь |
| `WALLET_ADDED` | Wallet Added | Wallet | Добавлен новый кошелек |
| `AMOUNT_THRESHOLD` | Amount Threshold | Zap | Превышен лимит суммы |

#### Структура данных:

```typescript
interface TriggerNodeData {
  trigger: string;                // Тип триггера (из списка выше)
  config?: Record<string, any>;   // Дополнительные параметры (опционально)
  executionStatus?: 'idle' | 'running' | 'success' | 'error';
  executionResult?: any;          // Результат выполнения
  executionTime?: number;         // Время выполнения (ms)
}
```

#### Пример использования:

```json
{
  "id": "trigger-1",
  "type": "trigger",
  "data": {
    "trigger": "ORDER_CREATED",
    "config": {}
  }
}
```

#### Визуальные особенности:
- 🟦 Синий фон с иконкой события
- ➡️ Один output handle (правая сторона)
- 📊 Показывает execution status во время теста

---

### 2. Condition Node (Условие)

**Назначение:** Логическое ветвление с двумя выходами (TRUE/FALSE).

#### Доступные поля для проверки:

| Field | Label | Type | Описание |
|-------|-------|------|----------|
| `amount` | Order Amount | number | Сумма заказа |
| `fiatAmount` | Fiat Amount | number | Фиатная сумма |
| `currency` | Crypto Currency | string | Криптовалюта (BTC, ETH...) |
| `fiatCurrency` | Fiat Currency | string | Фиатная валюта (EUR, PLN...) |
| `country` | User Country | string | Страна пользователя |
| `kycStatus` | KYC Status | string | Статус KYC |
| `userId` | User ID | string | ID пользователя |
| `email` | User Email | string | Email пользователя |
| `orderCount` | User Order Count | number | Количество заказов |
| `totalVolume` | User Total Volume | number | Общий объем транзакций |

#### Доступные операторы:

| Operator | Label | JSON Logic | Описание |
|----------|-------|------------|----------|
| `==` | Equals | `==` | Равно |
| `!=` | Not Equals | `!=` | Не равно |
| `>` | Greater Than | `>` | Больше |
| `<` | Less Than | `<` | Меньше |
| `>=` | Greater or Equal | `>=` | Больше или равно |
| `<=` | Less or Equal | `<=` | Меньше или равно |
| `in` | In Array | `in` | Значение в массиве |
| `not_in` | Not In Array | `!in` | Значение не в массиве |
| `contains` | Contains (string) | `in` | Строка содержит |
| `matches` | Regex Match | `!!` | Соответствие regex |

#### Структура данных:

```typescript
interface ConditionNodeData {
  field: string;                  // Поле для проверки
  operator: string;               // Оператор сравнения
  value: any;                     // Значение для сравнения
  label?: string;                 // Человекочитаемое название (опционально)
  executionStatus?: 'idle' | 'running' | 'success' | 'error';
  executionResult?: boolean;      // Результат условия (true/false)
  executionTime?: number;         // Время выполнения (ms)
}
```

#### Примеры использования:

**Пример 1: Проверка большой суммы**
```json
{
  "id": "condition-1",
  "type": "condition",
  "data": {
    "field": "amount",
    "operator": ">",
    "value": 10000,
    "label": "High value check"
  }
}
```

**Пример 2: Проверка страны в blacklist**
```json
{
  "id": "condition-2",
  "type": "condition",
  "data": {
    "field": "country",
    "operator": "in",
    "value": ["RU", "BY", "KP"],
    "label": "Sanctioned country check"
  }
}
```

**Пример 3: Проверка email домена**
```json
{
  "id": "condition-3",
  "type": "condition",
  "data": {
    "field": "email",
    "operator": "contains",
    "value": "@temp-mail.com",
    "label": "Temp email check"
  }
}
```

#### Визуальные особенности:
- 🟨 Желтый/акцентный фон с иконкой GitBranch
- ⬅️ Один input handle (левая сторона)
- ➡️ Два output handles: TRUE (зеленый, top 40%) и FALSE (красный, top 60%)
- 📊 Показывает TRUE/FALSE badge во время выполнения
- 🎨 Формула условия в отдельном блоке

---

### 3. Action Node (Действие)

**Назначение:** Конечное действие, которое выполняется при срабатывании workflow.

#### Доступные действия:

| Action Type | Label | Icon | Config Fields | Описание |
|------------|-------|------|---------------|----------|
| `FREEZE_ORDER` | Freeze Order | Ban | `reason` | Заморозить заказ |
| `REJECT_TRANSACTION` | Reject Transaction | XCircle | `reason` | Отклонить транзакцию |
| `REQUEST_DOCUMENT` | Request Document | FileText | `documentType`, `message` | Запросить документ |
| `REQUIRE_APPROVAL` | Require Approval | UserCheck | `approverRole`, `minApprovals` | Требовать ручное подтверждение |
| `SEND_NOTIFICATION` | Send Notification | Bell | `recipientRole`, `template`, `message` | Отправить уведомление |
| `FLAG_FOR_REVIEW` | Flag for Review | AlertTriangle | `reason` | Пометить для проверки |
| `AUTO_APPROVE` | Auto Approve | CheckCircle | (нет) | Автоматически одобрить |
| `ESCALATE_TO_COMPLIANCE` | Escalate to Compliance | AlertTriangle | `reason` | Эскалировать в Compliance |

#### Структура данных:

```typescript
interface ActionNodeData {
  actionType: string;             // Тип действия (из списка выше)
  config: Record<string, any>;    // Параметры действия
  executionStatus?: 'idle' | 'running' | 'success' | 'error';
  executionResult?: any;          // Результат действия
  executionTime?: number;         // Время выполнения (ms)
}
```

#### Примеры использования:

**Пример 1: Заморозить подозрительный заказ**
```json
{
  "id": "action-1",
  "type": "action",
  "data": {
    "actionType": "FREEZE_ORDER",
    "config": {
      "reason": "High-risk transaction detected"
    }
  }
}
```

**Пример 2: Запросить дополнительные документы**
```json
{
  "id": "action-2",
  "type": "action",
  "data": {
    "actionType": "REQUEST_DOCUMENT",
    "config": {
      "documentType": "Proof of Address",
      "message": "Please upload proof of address to verify your identity."
    }
  }
}
```

**Пример 3: Требовать ручное подтверждение**
```json
{
  "id": "action-3",
  "type": "action",
  "data": {
    "actionType": "REQUIRE_APPROVAL",
    "config": {
      "approverRole": "COMPLIANCE",
      "minApprovals": 2
    }
  }
}
```

**Пример 4: Отправить уведомление админу**
```json
{
  "id": "action-4",
  "type": "action",
  "data": {
    "actionType": "SEND_NOTIFICATION",
    "config": {
      "recipientRole": "SUPER_ADMIN",
      "template": "high_value_alert",
      "message": "High value transaction detected: {amount} {currency}"
    }
  }
}
```

#### Визуальные особенности:
- 🎨 Цвет зависит от типа действия (красный/зеленый/синий)
- ⬅️ Один input handle (левая сторона)
- 📋 Показывает параметры конфигурации
- 📊 Отображает execution status и время

---

## Примеры Workflow

### 1. AML Check (Anti-Money Laundering)

**Сценарий:** Проверка крупных транзакций и блокировка подозрительных.

```
[ORDER_CREATED] 
    → [amount > 50000?]
        TRUE → [FREEZE_ORDER + FLAG_FOR_REVIEW]
        FALSE → [AUTO_APPROVE]
```

**Визуальный граф:**
```json
{
  "nodes": [
    {
      "id": "1",
      "type": "trigger",
      "data": { "trigger": "ORDER_CREATED" }
    },
    {
      "id": "2",
      "type": "condition",
      "data": {
        "field": "amount",
        "operator": ">",
        "value": 50000,
        "label": "High value check"
      }
    },
    {
      "id": "3",
      "type": "action",
      "data": {
        "actionType": "FREEZE_ORDER",
        "config": { "reason": "AML: High value transaction" }
      }
    },
    {
      "id": "4",
      "type": "action",
      "data": {
        "actionType": "AUTO_APPROVE",
        "config": {}
      }
    }
  ],
  "edges": [
    { "source": "1", "target": "2" },
    { "source": "2", "sourceHandle": "true", "target": "3" },
    { "source": "2", "sourceHandle": "false", "target": "4" }
  ]
}
```

---

### 2. Country Sanctions Check

**Сценарий:** Блокировка транзакций из санкционных стран.

```
[USER_REGISTERED] 
    → [country in [RU, BY, KP]?]
        TRUE → [REJECT_TRANSACTION]
        FALSE → [SEND_NOTIFICATION (welcome)]
```

---

### 3. KYC Risk Level

**Сценарий:** Автоматическое принятие низкорисковых KYC заявок.

```
[KYC_SUBMITTED] 
    → [totalVolume < 1000?]
        TRUE → [AUTO_APPROVE]
        FALSE → [REQUIRE_APPROVAL (COMPLIANCE)]
```

---

### 4. Multi-Condition Chain

**Сценарий:** Сложная проверка с несколькими условиями.

```
[ORDER_CREATED]
    → [amount > 10000?]
        TRUE → [country in [US, EU]?]
            TRUE → [kycStatus == APPROVED?]
                TRUE → [AUTO_APPROVE]
                FALSE → [REQUEST_DOCUMENT]
            FALSE → [ESCALATE_TO_COMPLIANCE]
        FALSE → [AUTO_APPROVE]
```

---

## Компиляция в JSON Logic

Workflow автоматически компилируется в `json-logic-js` формат для выполнения.

### Пример компиляции:

**Visual Graph:**
```
TRIGGER: ORDER_CREATED
  → CONDITION: amount > 10000
      TRUE → ACTION: FREEZE_ORDER
      FALSE → ACTION: AUTO_APPROVE
```

**Compiled JSON Logic:**
```json
{
  "if": [
    {
      ">": [
        { "var": "amount" },
        10000
      ]
    },
    {
      "action": "FREEZE_ORDER",
      "config": { "reason": "High value transaction" }
    },
    {
      "action": "AUTO_APPROVE",
      "config": {}
    }
  ]
}
```

### Валидация графа

Перед компиляцией граф проходит валидацию:

✅ **Проверки:**
- Должна быть ровно одна trigger нода
- Должна быть хотя бы одна action нода
- Все ноды должны быть подключены (нет orphan nodes)
- Нет циклических зависимостей
- Condition ноды имеют хотя бы один output
- Все обязательные поля заполнены

❌ **Примеры ошибок:**
```json
{
  "valid": false,
  "errors": [
    "Workflow must have at least one trigger node",
    "Condition node 'abc-123' is missing required fields (field, operator, value)",
    "2 orphan node(s) found - all nodes must be connected"
  ]
}
```

---

## Статус Разработки

### ✅ Реализовано (MVP Complete)

**Phase 1: Database & Backend**
- [x] Prisma schema (Workflow, WorkflowExecution)
- [x] Zod validation schemas
- [x] WorkflowExecutor service
- [x] CRUD API endpoints (`/api/admin/workflows`)
- [x] Test API endpoint (`/api/admin/workflows/[id]/test`)
- [x] Publish API endpoint (`/api/admin/workflows/[id]/publish`)
- [x] Execution history API

**Phase 2: UI Components**
- [x] Custom Trigger/Condition/Action nodes
- [x] WorkflowCanvas (React Flow integration)
- [x] NodeToolbar (drag & drop)
- [x] PropertiesPanel (node editing)
- [x] WorkflowEditor page
- [x] Workflow list page
- [x] Theme integration (dark/light)

**Phase 3: Visual Features**
- [x] Node connections validation
- [x] Graph validation
- [x] Auto-compilation to json-logic
- [x] Real-time execution visualization
- [x] n8n-like execution animation
- [x] Double-click quick edit
- [x] Canvas controls (zoom, select all, fit view)

**Phase 4: Testing & Polish**
- [x] TestWorkflowDialog with sample data
- [x] Execution status on nodes (running/success/error)
- [x] Execution time display
- [x] Condition result badges (TRUE/FALSE)
- [x] Delete workflow functionality
- [x] Collapsible header

### 🚧 В Разработке

**Phase 5: Templates (Next)**
- [ ] Workflow templates (pre-built examples)
- [ ] Template gallery UI
- [ ] One-click template import

**Phase 6: Integration (Future)**
- [ ] Real integration with Orders flow
- [ ] Real integration with PayIn flow
- [ ] Real integration with KYC flow
- [ ] Trigger hooks in application code
- [ ] Action handlers implementation
- [ ] Webhook support for external triggers

### 🎯 Roadmap

**Q1 2025:**
- [ ] Workflow versioning
- [ ] Rollback to previous version
- [ ] A/B testing workflows
- [ ] Workflow analytics (execution stats)
- [ ] Performance monitoring

**Q2 2025:**
- [ ] Advanced actions (API calls, webhooks)
- [ ] Complex conditions (AND/OR groups)
- [ ] Variables & data transformation
- [ ] Scheduled triggers (cron)
- [ ] Email triggers

---

## 📚 Дополнительные ресурсы

- **API Documentation:** `/api/admin/workflows` - CRUD endpoints
- **Test Endpoint:** `/api/admin/workflows/[id]/test` - Testing with mock data
- **Execution Logs:** `/api/admin/workflows/[id]/executions` - History
- **Implementation Plan:** `WORKFLOW_ENGINE_IMPLEMENTATION_PLAN.md`
- **Progress Report:** `WORKFLOW_ENGINE_COMPLETE.md`

---

## 🛠️ Technical Details

### Node Types Registry

```typescript
const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
};
```

### Execution Flow

```typescript
// 1. User creates workflow visually
// 2. Graph is validated
// 3. Graph is compiled to json-logic
// 4. Both visual state and logic saved to DB
// 5. On trigger event:
const workflow = await prisma.workflow.findFirst({
  where: { trigger: 'ORDER_CREATED', isActive: true }
});
const result = await workflowExecutor.executeWorkflow(
  workflow.id,
  workflow.logicState,
  contextData
);
```

### Real-time Visualization

```typescript
// During test execution:
setExecutionStatus(nodeId, 'running'); // Yellow ring, spinning loader
await simulateDelay(500);
setExecutionStatus(nodeId, 'success'); // Green ring, checkmark
setExecutionResult(nodeId, { result: true, time: 245 });
```

---

**Последнее обновление:** 2025-01-27  
**Версия:** MVP 1.0  
**Статус:** ✅ Production Ready (MVP)

