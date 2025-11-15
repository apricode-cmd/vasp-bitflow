# 🎯 CRM Dashboard - План Улучшений

## 📊 **Текущее состояние:**

**Что есть сейчас:**
- ✅ Базовые статистики (Orders, Users, Volume, KYC)
- ✅ Графики (Volume chart, Currency distribution)
- ✅ Recent Orders список
- ✅ System Health статусы
- ✅ Quick Access карточки
- ✅ Time range фильтры (today, week, month, all)
- ✅ Auto-refresh каждую минуту
- ✅ Redis кеш (2 минуты TTL)

**Проблемы:**
- ❌ Нет **actionable insights** - админ видит цифры, но не знает ЧТО делать
- ❌ Нет **приоритетов** - что требует внимания СЕЙЧАС?
- ❌ Нет **alerts** - админ должен сам искать проблемы
- ❌ Нет **quick actions** - для частых задач нужно идти в другие разделы
- ❌ Слишком много данных - нет фокуса на важном
- ❌ Нет **real-time критических событий**
- ❌ Статичный дизайн - не хватает интерактивности

---

## 🚀 **План Улучшений (Приоритеты)**

### **🔴 PRIORITY 1: Actionable Dashboard (Админ знает ЧТО делать)**

#### **1.1 Action Center - Требует Внимания**

Блок в самом верху дашборда с КРИТИЧНЫМИ задачами:

```typescript
interface ActionItem {
  type: 'urgent' | 'warning' | 'info';
  title: string;
  description: string;
  count?: number;
  action: {
    label: string;
    href: string;
  };
  priority: number; // 1 = highest
}

Examples:
┌──────────────────────────────────────────────────┐
│ 🔴 ТРЕБУЕТ ВНИМАНИЯ (3)                         │
├──────────────────────────────────────────────────┤
│ ⚠️  5 Orders стоят >24h                         │
│     Клиенты ждут. Проверьте платежи             │
│     [Открыть Orders] →                          │
├──────────────────────────────────────────────────┤
│ 🟡 12 KYC на проверке                          │
│     Avg. wait time: 6.2h                        │
│     [Review KYC] →                              │
├──────────────────────────────────────────────────┤
│ 🟢 3 PayIn требуют подтверждения               │
│     [View PayIns] →                             │
└──────────────────────────────────────────────────┘
```

**Критерии для Action Items:**
- Orders в `PAYMENT_PENDING` > 24 часов → Urgent
- Orders в `PROCESSING` > 48 часов → Urgent  
- KYC `PENDING` > 24 часов → Warning
- PayIn `RECEIVED` без processing → Warning
- Low balance on platform wallets → Warning
- Failed integration (last 1h) → Urgent

---

#### **1.2 Quick Actions Bar**

Быстрые действия без перехода на другие страницы:

```
┌────────────────────────────────────────────────────┐
│ QUICK ACTIONS                                      │
├────────────────────────────────────────────────────┤
│ [+ Create Order]  [Approve KYC]  [Send Notification] │
│ [Refund Order]    [Block User]   [Export Data]     │
└────────────────────────────────────────────────────┘
```

**Модальные окна для:**
- Create Order для клиента
- Quick KYC approve/reject
- Send notification всем клиентам
- Refund order с причиной

---

#### **1.3 Real-Time Events Feed**

Live feed событий в правой колонке:

```
┌─────────────────────────────────────┐
│ 🔴 LIVE EVENTS                     │
├─────────────────────────────────────┤
│ 2s ago                              │
│ 💰 New Order #1234                  │
│ John Doe - €500 → BTC              │
│                                     │
│ 45s ago                             │
│ ✅ KYC Approved                     │
│ Jane Smith                          │
│                                     │
│ 2m ago                              │
│ ⚠️  Order stuck in PENDING         │
│ #1223 - 26h wait                   │
│                                     │
│ 5m ago                              │
│ 💳 PayIn Received                   │
│ Order #1222 - €1,200               │
└─────────────────────────────────────┘
```

**Event types:**
- New order created
- Order status changed
- KYC submitted/approved/rejected
- PayIn received
- PayOut sent
- User registered
- Integration failed
- Suspicious activity detected

---

### **🟡 PRIORITY 2: Better Insights (Админ понимает тренды)**

#### **2.1 Smart Metrics with Context**

Не просто цифры, а **сравнение + инсайты**:

```
┌──────────────────────────────────────────┐
│ Total Orders: 145                        │
│ ↑ +12% vs last week                     │
│ 🎯 Target: 200/week                     │
│ ━━━━━━━━━━━━░░░░ 73% to goal          │
│                                          │
│ 💡 Insight: Peak hours 14:00-18:00     │
│    Most popular: BTC (45%)              │
└──────────────────────────────────────────┘
```

**Для каждой метрики:**
- Current value
- Trend (vs previous period)
- Target/Goal (если есть)
- Progress bar
- AI-generated insight

---

#### **2.2 Performance Indicators**

KPIs для бизнеса:

```
┌────────────────────────────────────────────┐
│ KEY PERFORMANCE INDICATORS                 │
├────────────────────────────────────────────┤
│ Order Completion Rate    87% ✅            │
│ Avg. Processing Time     4.2h ⚠️          │
│ Customer Satisfaction    N/A               │
│ KYC Approval Rate        94% ✅            │
│ Revenue per Order        €842 ↑            │
│ Failed Orders Rate       3% ✅             │
└────────────────────────────────────────────┘
```

---

#### **2.3 Advanced Charts**

Больше визуализаций:

1. **Conversion Funnel:**
   ```
   Visitors → Registered → KYC → First Order → Repeat
   1000   →     450     →  320  →    280    →   120
   ```

2. **Order Status Flow:**
   ```
   PENDING → PAYMENT_PENDING → PROCESSING → COMPLETED
      ↓            ↓                ↓            ↓
   Cancelled    Expired         Failed      Success
   ```

3. **Heatmap:**
   - Orders by hour/day of week
   - Revenue by currency/time

4. **Cohort Analysis:**
   - User retention by registration week

---

### **🟢 PRIORITY 3: Better UX (Удобство для админа)**

#### **3.1 Customizable Dashboard**

Админ может настроить:
- Какие виджеты показывать
- Порядок виджетов (drag-and-drop)
- Размер виджетов
- Сохранить пресеты ("Morning Check", "EOD Review", "Weekly Report")

```typescript
interface DashboardLayout {
  userId: string;
  preset: 'default' | 'morning' | 'eod' | 'weekly';
  widgets: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    size: { w: number; h: number };
    config: any;
  }>;
}
```

---

#### **3.2 Filters & Drill-Down**

Клик на любую метрику → drill down:

```
Click on "145 Orders" →
  Modal opens with:
  - Orders by status breakdown
  - Orders by currency breakdown
  - Orders by date chart
  - Filter by status/currency/date
  - Export button
```

---

#### **3.3 Keyboard Shortcuts**

Для power users:

```
Cmd+K → Command palette (search anything)
Cmd+N → New order
Cmd+R → Refresh stats
Cmd+F → Find user/order
Cmd+1-9 → Navigate sections
```

---

### **🔵 PRIORITY 4: Automation & AI (Умный помощник)**

#### **4.1 Smart Alerts**

Автоматические уведомления:

```
┌─────────────────────────────────────────┐
│ 🤖 SMART ALERTS                        │
├─────────────────────────────────────────┤
│ ⚠️  Unusual activity detected          │
│     5 orders from same IP in 10min     │
│     [Investigate] [Ignore]             │
│                                         │
│ 💡 Opportunity: Weekend spike          │
│     Orders +45% on Saturdays           │
│     Consider weekend promo             │
└─────────────────────────────────────────┘
```

**Alert types:**
- Anomaly detection (unusual patterns)
- Risk alerts (fraud detection)
- Opportunities (growth patterns)
- System health issues

---

#### **4.2 Suggested Actions**

AI предлагает действия:

```
┌─────────────────────────────────────────┐
│ 💡 SUGGESTED ACTIONS                   │
├─────────────────────────────────────────┤
│ ✅ Approve 3 low-risk KYC requests     │
│    Estimated time: 5 min               │
│    [Auto-approve] [Review manually]    │
│                                         │
│ 📧 Send reminder to 8 users            │
│    Orders pending payment >12h         │
│    [Send now] [Schedule]               │
└─────────────────────────────────────────┘
```

---

#### **4.3 Predictive Analytics**

Прогнозы на основе истории:

```
┌─────────────────────────────────────────┐
│ 📈 FORECAST (Next 7 Days)              │
├─────────────────────────────────────────┤
│ Expected Orders:     180-220           │
│ Expected Revenue:    €82k-95k          │
│ Expected KYC:        45-60             │
│ Peak day:            Saturday          │
│                                         │
│ Confidence: 85%                        │
└─────────────────────────────────────────┘
```

---

## 📐 **Новая Структура Dashboard**

```
┌──────────────────────────────────────────────────────────────────┐
│ CRM Dashboard                    [Today ▼] [Refresh] [Settings]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🔴 ACTION CENTER (3 items require attention)                │ │
│ │ ⚠️  5 Orders >24h  │  🟡 12 KYC pending  │  🟢 3 PayIns    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌───────────────────────────────────────┐ ┌─────────────────┐   │
│ │ KEY METRICS (4 cards)                 │ │ LIVE EVENTS     │   │
│ │ Orders │ Users │ Volume │ KYC          │ │ • New order     │   │
│ │ ↑12%   │ ↑8%   │ ↑15%   │ →           │ │ • KYC approved  │   │
│ └───────────────────────────────────────┘ │ • PayIn received│   │
│                                            │ • ...           │   │
│ ┌───────────────────────────────────────┐ └─────────────────┘   │
│ │ PERFORMANCE INDICATORS                 │                       │
│ │ Completion Rate │ Avg Time │ Revenue   │                       │
│ └───────────────────────────────────────┘                       │
│                                                                   │
│ ┌──────────────────────┐ ┌────────────────────┐                 │
│ │ VOLUME CHART         │ │ CURRENCY MIX       │                 │
│ │ [Line graph]         │ │ [Pie chart]        │                 │
│ └──────────────────────┘ └────────────────────┘                 │
│                                                                   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ SMART ALERTS & SUGGESTIONS                                    │ │
│ │ • Unusual activity detected                                   │ │
│ │ • Suggested: Auto-approve 3 KYC                              │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌──────────────────────┐ ┌────────────────────┐                 │
│ │ RECENT ORDERS        │ │ SYSTEM HEALTH      │                 │
│ │ [List with actions]  │ │ [Status indicators]│                 │
│ └──────────────────────┘ └────────────────────┘                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ **Технический План Реализации**

### **Phase 1: Action Center (2-3 дня)**

**Файлы:**
1. `src/components/admin/dashboard/ActionCenter.tsx` - новый компонент
2. `src/app/api/admin/actions/route.ts` - API для action items
3. Update `src/app/(admin)/admin/page.tsx` - интегрировать компонент

**Логика:**
```typescript
// src/lib/services/action-center.service.ts
class ActionCenterService {
  async getActionItems(): Promise<ActionItem[]> {
    const items: ActionItem[] = [];
    
    // Check orders stuck >24h
    const stuckOrders = await prisma.order.count({
      where: {
        status: { in: ['PAYMENT_PENDING', 'PROCESSING'] },
        createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });
    
    if (stuckOrders > 0) {
      items.push({
        type: 'urgent',
        title: `${stuckOrders} Orders stuck >24h`,
        description: 'Customers waiting. Check payments',
        count: stuckOrders,
        action: { label: 'View Orders', href: '/admin/orders?stuck=true' },
        priority: 1
      });
    }
    
    // Check pending KYC
    const pendingKyc = await prisma.kycSession.count({
      where: { status: 'PENDING' }
    });
    
    if (pendingKyc > 5) {
      items.push({
        type: 'warning',
        title: `${pendingKyc} KYC pending review`,
        description: `Avg wait: ${await getAvgKycWait()}h`,
        count: pendingKyc,
        action: { label: 'Review KYC', href: '/admin/kyc' },
        priority: 2
      });
    }
    
    // Sort by priority
    return items.sort((a, b) => a.priority - b.priority);
  }
}
```

---

### **Phase 2: Real-Time Events (1-2 дня)**

**Технология:** Server-Sent Events (SSE) или WebSockets

**Файлы:**
1. `src/components/admin/dashboard/LiveEventsFeed.tsx`
2. `src/app/api/admin/events/stream/route.ts` - SSE endpoint
3. `src/lib/services/event-stream.service.ts`

**Реализация:**
```typescript
// Client side
export function LiveEventsFeed() {
  const [events, setEvents] = useState<Event[]>([]);
  
  useEffect(() => {
    const eventSource = new EventSource('/api/admin/events/stream');
    
    eventSource.onmessage = (event) => {
      const newEvent = JSON.parse(event.data);
      setEvents(prev => [newEvent, ...prev].slice(0, 20)); // Keep last 20
    };
    
    return () => eventSource.close();
  }, []);
  
  return (
    <ScrollArea className="h-[600px]">
      {events.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </ScrollArea>
  );
}

// Server side (SSE)
export async function GET(request: NextRequest) {
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  
  // Send events from Redis pub/sub or database polling
  const interval = setInterval(async () => {
    const events = await getRecentEvents();
    for (const event of events) {
      await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    }
  }, 5000); // Poll every 5s
  
  request.signal.addEventListener('abort', () => {
    clearInterval(interval);
    writer.close();
  });
  
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

### **Phase 3: Smart Metrics (2 дня)**

**Файлы:**
1. Update `src/app/api/admin/stats/route.ts` - добавить insights
2. `src/components/admin/dashboard/SmartMetricCard.tsx`
3. `src/lib/services/insights.service.ts`

**Логика:**
```typescript
// Insights generation
class InsightsService {
  async generateInsights(stats: Stats): Promise<Insight[]> {
    const insights: Insight[] = [];
    
    // Analyze order trends
    if (stats.trends.orders > 20) {
      insights.push({
        metric: 'orders',
        text: `Orders growing fast (+${stats.trends.orders}%). Consider scaling support team.`,
        type: 'positive'
      });
    }
    
    // Analyze peak times
    const peakHour = await this.analyzePeakHours();
    insights.push({
      metric: 'orders',
      text: `Peak hours: ${peakHour.start}-${peakHour.end}`,
      type: 'info'
    });
    
    // Analyze currency preferences
    const topCurrency = stats.chartData.currencies[0];
    insights.push({
      metric: 'volume',
      text: `Most popular: ${topCurrency.name} (${topCurrency.value}%)`,
      type: 'info'
    });
    
    return insights;
  }
}
```

---

### **Phase 4: Quick Actions (1-2 дня)**

**Файлы:**
1. `src/components/admin/dashboard/QuickActionsBar.tsx`
2. `src/components/admin/modals/` - modal components
   - `CreateOrderModal.tsx`
   - `QuickKycModal.tsx`
   - `SendNotificationModal.tsx`

---

## 📊 **Приоритизация для MVP**

### **Что делать СНАЧАЛА (1 неделя):**

1. ✅ **Action Center** (Priority 1.1) - 2-3 дня
   - Самое важное: админ сразу видит что требует внимания
   
2. ✅ **Smart Metrics with Context** (Priority 2.1) - 1-2 дня
   - Добавить trends, goals, insights к существующим метрикам
   
3. ✅ **Performance Indicators** (Priority 2.2) - 1 день
   - KPIs для бизнеса

**Итого:** 4-6 дней работы, МАКСИМАЛЬНАЯ польза для админа

---

### **Что делать ПОТОМ (2-3 недели):**

4. **Real-Time Events Feed** (Priority 1.3) - 2 дня
5. **Quick Actions Bar** (Priority 1.2) - 2 дня
6. **Advanced Charts** (Priority 2.3) - 3 дня
7. **Filters & Drill-Down** (Priority 3.2) - 2 дня

---

### **Что делать В БУДУЩЕМ:**

8. Customizable Dashboard (Priority 3.1)
9. Smart Alerts (Priority 4.1)
10. Suggested Actions (Priority 4.2)
11. Predictive Analytics (Priority 4.3)

---

## ✅ **Готов начать?**

**Предлагаю начать с Phase 1:**
- Action Center компонент
- API для action items
- Интеграция в dashboard

**Ожидаемый результат:**
- Админ сразу видит что требует внимания
- Быстрые ссылки на проблемные области
- Визуально выделены критичные задачи

**Начинаем?** 🚀

