# 🎯 KYC Conditional Logic - User Guide

## ✨ Что реализовано (Phase 2.1)

### 1. **Conditional Logic UI** ⭐

Теперь можно визуально настроить условия показа полей без кода!

**Доступ:** `/admin/kyc-fields` → Edit Field → Tab "Conditional Logic"

#### Возможности:

- **Depends On Field**: Выбор поля, от которого зависит текущее поле
- **Operators**: 
  - `==` (equals) - поле равно значению
  - `!=` (not equals) - поле не равно значению
  - `in` - поле входит в список значений
  - `not_in` - поле не входит в список
  - `>` (greater than) - больше чем
  - `<` (less than) - меньше чем
  - `contains` - содержит текст
  - `exists` - имеет любое значение
- **Value Input**: Умный ввод значения (зависит от оператора)
- **Live Preview**: Показывает когда поле будет видимо
- **Clear Button**: Быстро удалить условие

#### Пример использования:

```
Поле: "PEP Role Title"
Show when: pep_status != "NO"

Результат: Поле "PEP Role Title" показывается 
только когда пользователь выбрал PEP Status не равный "NO"
```

---

### 2. **UX Enhancements** 🎨

**Доступ:** `/admin/kyc-fields` → Edit Field → Tab "UX Enhancements"

#### Возможности:

1. **Help Text**
   - Текст подсказки под полем
   - Markdown поддержка (будет в Phase 2.2)
   - Помогает пользователю понять как заполнить поле

2. **Placeholder Text**
   - Текст внутри пустого input поля
   - Автоматически скрывается при вводе
   - Поддерживается только для text, email, tel, number, textarea, date

3. **Custom CSS Classes**
   - Tailwind CSS классы для кастомизации
   - Примеры:
     - `w-full` - полная ширина
     - `md:w-1/2` - половина ширины на средних экранах
     - `col-span-2` - занимает 2 колонки в grid

---

### 3. **Улучшенный Edit Dialog** 📝

**3 вкладки вместо одной большой формы:**

#### Tab 1: Basic Settings
- Label (название поля)
- Priority (порядок отображения)
- Required/Enabled switches
- Validation Rules (JSON)
- Options (для select/radio/checkbox)

#### Tab 2: Conditional Logic
- Visual dependency builder
- Operator selector
- Value input
- Live preview

#### Tab 3: UX Enhancements
- Help text
- Placeholder
- Custom CSS classes

---

## 🎯 Примеры использования

### Пример 1: PEP Fields (уже настроено)

```yaml
Field: pep_role_title
Depends On: pep_status
Operator: !=
Value: NO
Help Text: "Enter your official role or position in government"
Placeholder: "e.g., Minister of Finance"
```

### Пример 2: Employment Fields

```yaml
Field: employer_name
Depends On: employment_status
Operator: in
Value: ["EMPLOYED_FT", "EMPLOYED_PT"]
Help Text: "Full legal name of your employer"
Placeholder: "e.g., Acme Corporation Ltd."
Custom Class: "w-full"
```

### Пример 3: Conditional Business Fields

```yaml
Field: biz_name
Depends On: employment_status
Operator: ==
Value: SELF_EMPLOYED
Help Text: "Registered business name"
Placeholder: "Enter your company name"
Required: Yes (conditional)
```

---

## 📊 Database Structure

Новые поля в `KycFormField`:

```prisma
model KycFormField {
  // ... existing fields ...
  
  // Conditional Logic
  dependsOn   String?  // Parent field name
  showWhen    Json?    // { operator, value }
  
  // UX Enhancements  
  helpText    String?  // Help text below field
  placeholder String?  // Placeholder text
  customClass String?  // Tailwind CSS classes
}
```

---

## 🔧 API Changes

### PATCH /api/admin/kyc/form-fields/[id]

**New fields in request body:**

```json
{
  "label": "PEP Role Title",
  "dependsOn": "pep_status",
  "showWhen": {
    "operator": "!=",
    "value": "NO"
  },
  "helpText": "Enter your official role or position",
  "placeholder": "e.g., Minister of Finance",
  "customClass": "w-full"
}
```

---

## 🚀 Next Steps (Phase 2.2)

### Validation Builder UI (планируется на следующую неделю)

- **Visual Validation Rules**
  - Min/Max length
  - Regex patterns
  - Email/URL validators
  - Custom validators
  - Error messages

- **Smart Validation**
  - Field type-specific rules
  - Conditional validation
  - Cross-field validation

---

## 💡 Tips & Best Practices

### 1. Circular Dependencies
❌ **Избегайте:**
```
Field A depends on Field B
Field B depends on Field A
```

✅ **Правильно:**
```
Field A (parent, no dependencies)
Field B depends on Field A
Field C depends on Field A or B
```

### 2. Complex Conditions
Для сложных условий используйте несколько полей:

```
Field: pep_details_section
Depends On: pep_status
Operator: !=
Value: NO

Field: pep_role_title (внутри секции)
Depends On: pep_status
Operator: in
Value: ["SELF_CURRENT", "SELF_FORMER"]
```

### 3. Help Text
✅ **Хорошо:**
- Кратко и понятно
- Примеры значений
- Ссылки на документацию

❌ **Плохо:**
- Слишком длинный текст
- Юридический жаргон без пояснений
- Дублирование label

### 4. Placeholder
✅ **Хорошо:**
- `e.g., John Doe`
- `Enter your email address`
- `Select country...`

❌ **Плохо:**
- `Fill this field` (очевидно)
- Очень длинный текст
- Дублирование label

---

## 🐛 Troubleshooting

### Problem: Поле не показывается/скрывается

**Checklist:**
1. ✅ Проверьте `dependsOn` field name (точное совпадение)
2. ✅ Проверьте operator и value
3. ✅ Проверьте что parent field существует
4. ✅ Проверьте priority (порядок полей)
5. ✅ Проверьте `isEnabled` = true

### Problem: Placeholder не работает

**Причина:** Placeholder поддерживается только для определенных типов полей

**Поддерживаемые типы:**
- text
- email
- tel
- number
- textarea
- date

**НЕ поддерживается:**
- select
- radio
- checkbox
- file

### Problem: Custom CSS classes не применяются

**Решение:**
1. Используйте только Tailwind CSS классы
2. Проверьте что классы существуют в Tailwind
3. Используйте `!` для override: `!w-full`
4. Проверьте responsive breakpoints: `md:w-1/2`

---

## 📱 Testing

### Как протестировать conditional logic:

1. **Admin Panel:** `/admin/kyc-fields`
2. **Edit Field** → Tab "Conditional Logic"
3. **Set Condition** (например, depends on `pep_status`)
4. **Open User KYC Form:** `/kyc/start`
5. **Fill parent field** (например, выберите PEP Status)
6. **Verify:** Зависимое поле появляется/исчезает

---

## 📚 Resources

- **Enterprise Plan:** `/KYC_ENTERPRISE_PLAN.md`
- **Conditional Fields Plan:** `/docs/archive/2025-Q1/CONDITIONAL_FIELDS_PLAN.md`
- **KYC System Audit:** `/docs/archive/2025-Q1/KYC_SYSTEM_AUDIT.md`

---

## 💰 Business Value

### For Customers:
- ✅ Visual form builder (no code)
- ✅ Faster KYC customization
- ✅ Better UX for end users
- ✅ Compliance-ready

### For Us:
- ✅ **Premium feature**: +$500-1000/month
- ✅ Competitive advantage
- ✅ Faster client onboarding
- ✅ Reduced support tickets

---

**Готово к использованию! 🚀**

Перейдите в `/admin/kyc-fields` и попробуйте новые возможности.

