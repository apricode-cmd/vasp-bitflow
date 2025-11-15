# ✏️ Inline Редактирование в Таблицах - Руководство

## 🎯 Что реализовано

✅ **Inline редактирование** прямо в ячейках таблицы (как в TanStack Table документации)  
⏳ **Drag-and-drop колонок** (требует установки `@dnd-kit` пакетов)

---

## 📋 Как использовать

### 1. Импортировать компоненты

```typescript
import { DataTableAdvanced } from '@/components/admin/DataTableAdvanced';
import { EditableTextCell, createEditableSelectCell } from '@/components/admin/EditableCells';
```

### 2. Создать Editable Columns

```typescript
// Text field (auto-saves on blur)
{
  accessorKey: 'senderName',
  header: 'Sender Name',
  cell: EditableTextCell
}

// Select dropdown (auto-saves on change)
const EditableStatusCell = createEditableSelectCell<PayIn>([
  { label: 'Pending', value: 'PENDING' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Completed', value: 'COMPLETED' },
]);

{
  accessorKey: 'status',
  header: 'Status',
  cell: EditableStatusCell
}

// Number field with min/max/step
const EditableProgressCell = createEditableNumberCell<PayIn>({
  min: 0,
  max: 100,
  step: 1,
  suffix: '%'
});

{
  accessorKey: 'progress',
  header: 'Progress',
  cell: EditableProgressCell
}
```

### 3. Добавить обработчик `onDataUpdate`

```typescript
<DataTableAdvanced
  columns={columns}
  data={data}
  onDataUpdate={async (rowIndex, columnId, value) => {
    const item = data[rowIndex];
    if (!item) return;

    try {
      // Save to server
      const response = await fetch(`/api/admin/resource/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [columnId]: value }),
      });

      if (!response.ok) {
        toast.error(`Failed to update ${columnId}`);
        return;
      }

      // Update local state optimistically
      setData(prev => prev.map((row, idx) => 
        idx === rowIndex ? { ...row, [columnId]: value } : row
      ));

      toast.success('Updated successfully');
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('Failed to save changes');
      // Refresh to revert changes
      await fetchData();
    }
  }}
/>
```

---

## 🎨 Доступные Editable Cells

### 1. **EditableTextCell** 
- Простое текстовое поле
- Сохраняется при onBlur
- Подходит для: name, email, notes

```typescript
{
  accessorKey: 'firstName',
  header: 'First Name',
  cell: EditableTextCell
}
```

### 2. **createEditableSelectCell(options)** 
- Dropdown select
- Сохраняется при выборе
- Подходит для: status, role, category

```typescript
const EditableRoleCell = createEditableSelectCell<User>([
  { label: 'Admin', value: 'ADMIN' },
  { label: 'User', value: 'USER' },
]);

{
  accessorKey: 'role',
  header: 'Role',
  cell: EditableRoleCell
}
```

### 3. **createEditableNumberCell(config)** 
- Числовое поле с min/max/step
- Сохраняется при onBlur
- Подходит для: amount, progress, quantity

```typescript
const EditableAmountCell = createEditableNumberCell<Order>({
  min: 0,
  max: 1000000,
  step: 0.01,
  suffix: 'USD'
});

{
  accessorKey: 'amount',
  header: 'Amount',
  cell: EditableAmountCell
}
```

---

## ✅ Где уже работает

- ✅ **PayIn Management** (`/admin/pay-in`) - status, senderName
- ⏳ **Orders** - coming soon
- ⏳ **Users** - coming soon
- ⏳ **KYC** - coming soon

---

## 🔧 API Backend

Для inline редактирования нужен PATCH endpoint:

```typescript
// /api/admin/pay-in/[id]/route.ts

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const authResult = await requireAdminAuth();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    
    // Validate with Zod
    const validated = updateSchema.parse(body);

    // Update in database
    const updated = await prisma.resource.update({
      where: { id: params.id },
      data: validated,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId: authResult.session.user.id,
        action: 'RESOURCE_UPDATED',
        entityType: 'RESOURCE',
        entityId: params.id,
        details: { changes: validated },
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update' },
      { status: 500 }
    );
  }
}
```

---

## 🎨 Стилизация

Editable cells автоматически стилизованы под таблицу:
- **Border-0** - без границ в обычном состоянии
- **Focus Ring** - кольцо при фокусе
- **Transparent BG** - прозрачный фон
- **H-8** - высота как у обычных ячеек

---

## 🚀 Best Practices

### 1. **Optimistic Updates**
Обновляй UI сразу, откатывай при ошибке:

```typescript
// Update local state first
setData(prev => prev.map((row, idx) => 
  idx === rowIndex ? { ...row, [columnId]: value } : row
));

// Then save to server
const response = await fetch(...);

if (!response.ok) {
  // Revert on error
  await fetchData();
}
```

### 2. **Валидация**
Валидируй на сервере через Zod:

```typescript
const updateSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE']).optional(),
  senderName: z.string().min(1).max(255).optional(),
});
```

### 3. **Audit Trail**
Логируй все изменения:

```typescript
await prisma.auditLog.create({
  data: {
    adminId: session.user.id,
    action: 'PAYIN_UPDATED',
    entityType: 'PAYIN',
    entityId: payInId,
    details: { changes: validated },
  },
});
```

### 4. **Error Handling**
Показывай понятные ошибки:

```typescript
try {
  const response = await fetch(...);
  
  if (!response.ok) {
    const error = await response.json();
    toast.error(error.message || 'Failed to update');
    return;
  }
  
  toast.success('Updated successfully');
} catch (error) {
  console.error('Update failed:', error);
  toast.error('Network error');
  await fetchData(); // Revert
}
```

---

## 📦 Установка Drag-and-Drop (Опционально)

Для drag-and-drop колонок нужно установить:

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Затем можно добавить DraggableColumnHeader (TODO).

---

## 🎉 Готово!

Теперь все таблицы с `DataTableAdvanced` поддерживают inline редактирование! 

Просто добавь:
1. ✅ `EditableTextCell` или `createEditableSelectCell` в column definition
2. ✅ `onDataUpdate` handler в `<DataTableAdvanced>`
3. ✅ PATCH endpoint в `/api/admin/resource/[id]`

И всё работает! 🚀

