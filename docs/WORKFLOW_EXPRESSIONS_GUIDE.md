# Workflow Expressions Guide (n8n-style)

## 🎯 Обзор

Workflow Engine теперь поддерживает **выражения** (expressions) для передачи данных между нодами, как в n8n.

### Ключевые возможности:
- ✅ **Expression Editor** - `{{ }}` синтаксис
- ✅ **Variable Picker** - автокомплит из предыдущих нод
- ✅ **Real-time Preview** - предпросмотр результата
- ✅ **Upstream Data Flow** - доступ к данным из любой предыдущей ноды

---

## 📝 Синтаксис Expressions

### Базовый синтаксис

```javascript
{{ $node.fieldName }}
```

- `$node` - ссылка на данные из предыдущих нод
- `fieldName` - название поля/переменной

### Примеры:

**1. Простая переменная:**
```javascript
{{ $node.amount }}
// Output: 15000
```

**2. Строка с переменной:**
```javascript
High-risk transaction: {{ $node.amount }} {{ $node.currency }}
// Output: "High-risk transaction: 15000 BTC"
```

**3. В условии:**
```javascript
Field: amount
Operator: >
Value: {{ $node.threshold }}
```

**4. В тексте уведомления:**
```javascript
User {{ $node.email }} from {{ $node.country }} made an order for {{ $node.amount }} {{ $node.currency }}
```

---

## 🔄 Доступные переменные по типам нод

### 1. Trigger Node

Все Trigger ноды предоставляют полный контекст события:

| Variable | Type | Example | Description |
|----------|------|---------|-------------|
| `{{ $node.amount }}` | number | `15000` | Сумма криптовалюты |
| `{{ $node.fiatAmount }}` | number | `15000` | Фиатная сумма |
| `{{ $node.currency }}` | string | `BTC` | Криптовалюта |
| `{{ $node.fiatCurrency }}` | string | `EUR` | Фиатная валюта |
| `{{ $node.userId }}` | string | `user_123` | ID пользователя |
| `{{ $node.email }}` | string | `user@example.com` | Email |
| `{{ $node.country }}` | string | `US` | Страна |
| `{{ $node.kycStatus }}` | string | `APPROVED` | Статус KYC |
| `{{ $node.orderCount }}` | number | `5` | Количество заказов |
| `{{ $node.totalVolume }}` | number | `50000` | Общий объем |

---

### 2. Condition Node

Condition ноды предоставляют результат проверки:

| Variable | Type | Example | Description |
|----------|------|---------|-------------|
| `{{ $node.result }}` | boolean | `true` | Результат условия |
| `{{ $node.field }}` | string | `amount` | Проверяемое поле |
| `{{ $node.value }}` | any | `10000` | Значение для сравнения |

---

### 3. Action Node

Action ноды предоставляют результат выполнения:

| Variable | Type | Example | Description |
|----------|------|---------|-------------|
| `{{ $node.success }}` | boolean | `true` | Успешность действия |
| `{{ $node.actionType }}` | string | `FREEZE_ORDER` | Тип действия |

---

## 💡 Примеры использования

### Пример 1: Динамический порог

**Задача:** Проверять сумму относительно порога из конфигурации

**Workflow:**
```
TRIGGER: ORDER_CREATED
  → CONDITION: amount > {{ $node.threshold }}
      TRUE → FREEZE_ORDER
      FALSE → AUTO_APPROVE
```

**В UI:**
1. Создать Condition ноду
2. Field: `amount`
3. Operator: `>`
4. Value: Нажать кнопку **✨** (Sparkles) → включить Expression mode
5. Вписать: `{{ $node.threshold }}`
6. Или нажать кнопку **</> Code** → выбрать из списка переменных

---

### Пример 2: Персонализированное уведомление

**Задача:** Отправить уведомление с данными пользователя

**Workflow:**
```
TRIGGER: ORDER_CREATED
  → SEND_NOTIFICATION
      Message: "User {{ $node.email }} from {{ $node.country }} placed order #{{ $node.orderId }}"
```

**В UI:**
1. Создать Action ноду → `SEND_NOTIFICATION`
2. В поле **Message** нажать **✨**
3. Вписать или выбрать переменные:
   ```
   User {{ $node.email }} from {{ $node.country }} placed order for {{ $node.amount }} {{ $node.currency }}
   ```

---

### Пример 3: Условие с несколькими переменными

**Задача:** Проверить, что страна НЕ в blacklist

**Workflow:**
```
TRIGGER: USER_REGISTERED
  → CONDITION: country in {{ $node.blacklistCountries }}
      TRUE → REJECT_TRANSACTION
      FALSE → AUTO_APPROVE
```

**В UI:**
1. Condition нода
2. Field: `country`
3. Operator: `in`
4. Value: `{{ $node.blacklistCountries }}` (массив из конфигурации)

---

### Пример 4: Цепочка нод с передачей данных

**Задача:** Использовать результат предыдущей Condition в Action

**Workflow:**
```
TRIGGER: ORDER_CREATED
  → CONDITION (ID: check-1): amount > 10000
      TRUE → CONDITION (ID: check-2): country in blacklist
          TRUE → ESCALATE_TO_COMPLIANCE
              Reason: "High-value order from {{ $node.country }}, condition result: {{ $node.result }}"
```

**В UI:**
1. После создания первой Condition, вторая Condition может использовать её результат
2. В Action "ESCALATE_TO_COMPLIANCE":
   - Reason: `High-value order from {{ $node.country }}, result: {{ $node.result }}`
3. Variable Picker покажет все upstream ноды

---

## 🛠️ Как использовать Expression Editor

### Шаг 1: Открыть PropertiesPanel

Double-click на ноду или выделить и нажать в Properties Panel

### Шаг 2: Найти поле с поддержкой expressions

Поля с поддержкой:
- **Condition → Value** (сравниваемое значение)
- **Action → Reason** (причина действия)
- **Action → Message** (текст уведомления/сообщения)
- **Action → Document Type** (тип документа)

### Шаг 3: Включить Expression Mode

Нажать **✨ Sparkles** иконку справа от input поля

### Шаг 4: Выбрать переменную

**Вариант A: Вручную**
```javascript
{{ $node.amount }}
```

**Вариант B: Variable Picker**
1. Нажать **</> Code** кнопку
2. В popover выбрать нужную переменную
3. Переменная автоматически вставится

### Шаг 5: Сохранить

Нажать **Save** в Properties Panel

---

## 🎨 UI Элементы

### Expression Badge
Когда включен Expression mode, появляется badge:
```
[EXPR] ✨
```

### Variable Picker Popover

Показывает группированные переменные:

```
┌─────────────────────────────────────┐
│ Available Variables                 │
├─────────────────────────────────────┤
│ [TRIGGER] Order Created             │
│   amount          → number          │
│   currency        → string          │
│   country         → string          │
│                                     │
│ [CONDITION] High Value Check        │
│   result          → boolean         │
│   field           → string          │
└─────────────────────────────────────┘
```

### Expression Hint Box

Подсказка при включенном Expression mode:

```
ℹ️ Expression Mode
Use {{ $node.field }} to reference data from previous nodes
```

### Example Preview

Живой пример для текущего выражения:

```
Example output:
15000
```

---

## 🔍 Как работает Variable Discovery

### Upstream Node Discovery

Expression Editor автоматически находит все ноды **ДО** текущей ноды:

```
TRIGGER (ID: trigger-1)
  → CONDITION (ID: cond-1)
      → CONDITION (ID: cond-2) ← ВЫ ЗДЕСЬ
          → ACTION (ID: act-1)
```

**Доступные переменные для cond-2:**
- ✅ `trigger-1` (Trigger)
- ✅ `cond-1` (Condition)
- ❌ `act-1` (Action) - еще не выполнена

### Алгоритм:

1. Найти все **incoming edges** для текущей ноды
2. Рекурсивно пройти вверх по графу
3. Собрать все upstream ноды
4. Для каждой ноды определить её output schema
5. Показать переменные в Variable Picker

---

## ⚙️ Технические детали

### TypeScript Interface

```typescript
interface ExpressionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  availableVariables?: VariableGroup[];
  type?: 'text' | 'number';
}

interface VariableGroup {
  nodeId: string;
  nodeName: string;
  nodeType: 'trigger' | 'condition' | 'action';
  variables: Variable[];
}

interface Variable {
  path: string;          // e.g., "amount"
  label: string;         // e.g., "Order Amount"
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  example?: any;         // Mock example value
}
```

### Evaluation (Future)

В будущем выражения будут вычисляться во время выполнения:

```typescript
// Input
const expression = "User {{ $node.email }} from {{ $node.country }}";
const context = {
  email: "test@example.com",
  country: "US"
};

// Output
"User test@example.com from US"
```

---

## 📚 Сравнение с n8n

| Feature | n8n | Наша реализация | Status |
|---------|-----|-----------------|--------|
| `{{ }}` syntax | ✅ | ✅ | Done |
| Variable picker | ✅ | ✅ | Done |
| Upstream discovery | ✅ | ✅ | Done |
| Expression preview | ✅ | ✅ | Done |
| Math operations | ✅ | ❌ | Future |
| String methods | ✅ | ❌ | Future |
| Date formatting | ✅ | ❌ | Future |
| Conditional logic | ✅ | ❌ | Future |

---

## 🚀 Roadmap

### Phase 1 (Done ✅)
- [x] Expression syntax `{{ }}`
- [x] Variable picker UI
- [x] Upstream node discovery
- [x] Visual expression mode toggle
- [x] Real-time hints

### Phase 2 (Next)
- [ ] Expression evaluation engine
- [ ] Math operations: `{{ $node.amount * 1.1 }}`
- [ ] String methods: `{{ $node.email.toUpperCase() }}`
- [ ] Array methods: `{{ $node.items[0] }}`
- [ ] Conditional: `{{ $node.amount > 1000 ? 'high' : 'low' }}`

### Phase 3 (Future)
- [ ] Date/time functions
- [ ] Custom functions
- [ ] Multi-node references: `{{ $node["Node Name"].field }}`
- [ ] Expression library/snippets

---

## 💡 Tips & Best Practices

### 1. Именование нод

Давайте нодам понятные имена (через label), чтобы в Variable Picker было легко найти:

```
❌ condition-abc123
✅ High Value Check
```

### 2. Используйте expressions для динамических данных

```
❌ Hardcoded: "High risk transaction"
✅ Dynamic: "High risk transaction: {{ $node.amount }} {{ $node.currency }}"
```

### 3. Проверяйте доступность переменных

Variable Picker показывает только **upstream** ноды. Если переменной нет в списке, проверьте:
- Нода подключена **ДО** текущей?
- Нода корректного типа (Trigger/Condition/Action)?

### 4. Expression vs Static mode

- **Static mode** - для фиксированных значений (10000, "EUR", "ADMIN")
- **Expression mode** - для данных из других нод

---

## 🐛 Troubleshooting

### Проблема: Variable Picker пустой

**Решение:**
- Убедитесь, что есть ноды **ДО** текущей в графе
- Проверьте, что ноды соединены edges

### Проблема: Expression не работает

**Решение:**
- Проверьте синтаксис: `{{ $node.field }}`
- Убедитесь, что Expression mode включен (badge EXPR)
- Phase 2 evaluation engine еще не реализован

### Проблема: Переменная не найдена

**Решение:**
- Проверьте spelling: `{{ $node.amount }}` (не `ammount`)
- Используйте Variable Picker для автокомплита

---

**Последнее обновление:** 2025-01-27  
**Версия:** 1.0 (Phase 1 - Expression UI)  
**Статус:** ✅ Expression Editor Ready, ⏳ Evaluation Engine Pending

