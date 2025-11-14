# ⚡ Vercel Performance Checklist

## ✅ Что УЖЕ СДЕЛАНО (см. README_PERFORMANCE.md):

- ✅ Prisma client оптимизирован
- ✅ Next.js config с production оптимизациями
- ✅ `/admin/stats` queries оптимизированы (groupBy вместо count)
- ✅ SWC minification
- ✅ Tree-shaking для lucide-react, recharts

---

## 🚀 КРИТИЧНО: DATABASE_URL на Vercel

**Проблема:** Если `connection_limit=1`, система работает медленно!

### Как проверить текущие настройки:

1. Откройте: https://vercel.com/dashboard
2. Settings → Environment Variables
3. Найдите `DATABASE_URL`
4. Проверьте значение `connection_limit`

### ✅ Правильная настройка:

```bash
postgres://postgres.rltqjdujiacriilmijpz:sYWtAE9nQNkViy3E@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10&pool_timeout=20&statement_cache_size=0
```

**Key параметры:**
- `connection_limit=10` ✅ (не 1!)
- `pool_timeout=20` ✅
- `pgbouncer=true` ✅
- `statement_cache_size=0` ✅ (required для pgBouncer)

---

## 🔍 Дополнительные рекомендации:

### 1. Edge Caching для статических данных

**Проблема:** API `/api/rates` вызывается на каждом рендере

**Решение:** Добавить кеширование на 30 секунд

```typescript
// src/app/api/rates/route.ts
export const revalidate = 30; // ISR - 30 секунд

// или
export const dynamic = 'force-cache';
export const revalidate = 30;
```

---

### 2. Database Indexes (если еще не добавлены)

**Проблема:** Медленные JOIN-запросы

**Решение:** Добавить индексы на часто используемых полях

```sql
-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_status ON "Order"("status");
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON "Order"("userId");
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON "Order"("createdAt");

-- KYC Sessions
CREATE INDEX IF NOT EXISTS idx_kyc_user_id ON "KycSession"("userId");
CREATE INDEX IF NOT EXISTS idx_kyc_status ON "KycSession"("status");

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON "User"("email");
CREATE INDEX IF NOT EXISTS idx_users_role ON "User"("role");
```

**Проверить существующие индексы:**
```sql
SELECT
    tablename,
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    schemaname = 'public'
ORDER BY
    tablename,
    indexname;
```

---

### 3. Lazy Loading для тяжелых компонентов

**Проблема:** Recharts (графики) увеличивают bundle size

**Решение:** Динамический импорт

```typescript
// src/app/(admin)/admin/page.tsx
import dynamic from 'next/dynamic';

// Вместо:
// import { LineChart } from 'recharts';

// Используй:
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />
});
```

---

### 4. Image Optimization

**Проблема:** Неоптимизированные изображения

**Решение:** Использовать Next.js Image компонент

```typescript
import Image from 'next/image';

// Вместо:
<img src="/logo.png" alt="Logo" />

// Используй:
<Image 
  src="/logo.png" 
  alt="Logo" 
  width={200} 
  height={50}
  priority // для важных изображений above-the-fold
/>
```

---

### 5. API Response Compression

**Решение:** Добавить в `next.config.js`

```javascript
const nextConfig = {
  // ... existing config
  
  compress: true, // Enable gzip compression
  
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=30, stale-while-revalidate=60',
          },
        ],
      },
    ];
  },
};
```

---

### 6. Monitoring & Debugging

#### A. Включить Vercel Analytics

```bash
npm install @vercel/analytics
```

```typescript
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

#### B. Vercel Speed Insights

```bash
npm install @vercel/speed-insights
```

```typescript
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

---

### 7. Проверка текущей производительности

#### Lighthouse Score:
```bash
# Запустить Lighthouse на production URL
npx lighthouse https://your-vercel-url.vercel.app --view
```

**Целевые показатели:**
- Performance: > 90
- FCP (First Contentful Paint): < 1.8s
- LCP (Largest Contentful Paint): < 2.5s
- TTI (Time to Interactive): < 3.8s

#### Vercel Logs:
```bash
# Проверить время ответа API
vercel logs --follow
```

**Хорошие показатели:**
- `GET /api/rates` - < 500ms
- `GET /api/admin/stats` - < 1s
- `POST /api/orders` - < 1.5s

---

## 🎯 Quick Wins (5-10 минут):

### 1. Добавить API кеширование

```typescript
// src/app/api/rates/route.ts
export const revalidate = 30;
```

### 2. Проверить DATABASE_URL

```bash
# В Vercel Dashboard
connection_limit=10 ✅
```

### 3. Добавить Vercel Analytics

```bash
npm install @vercel/analytics
# + добавить <Analytics /> в layout
```

---

## 📊 Ожидаемые результаты после всех оптимизаций:

| Метрика | До | После | Улучшение |
|---------|-----|-------|-----------|
| **First Load** | 5-8s | 1-2s | ⬇️ 75% |
| **API Response** | 2-5s | 300-800ms | ⬇️ 85% |
| **Bundle Size** | 1GB | 200-300MB | ⬇️ 70% |
| **Concurrent Users** | 1-2 | 10-15 | ⬆️ 7x |
| **Lighthouse Score** | 60-70 | 90+ | ⬆️ 30% |

---

## 🐛 Типичные проблемы и решения:

### Проблема 1: "Too many connections" в Supabase

**Причина:** `connection_limit=1` или нет pooling

**Решение:**
```bash
# В DATABASE_URL добавить:
?pgbouncer=true&connection_limit=10&pool_timeout=20
```

---

### Проблема 2: Медленная загрузка dashboard

**Причина:** Много отдельных API запросов

**Решение:**
- Использовать `groupBy` вместо множественных `count()`
- Добавить `Promise.all()` для параллельных запросов
- Кешировать статистику на 30-60 секунд

---

### Проблема 3: Большой bundle size

**Причина:** Неоптимизированные импорты

**Решение:**
```typescript
// ❌ Плохо:
import * as Icons from 'lucide-react';

// ✅ Хорошо:
import { User, Settings } from 'lucide-react';

// ✅ Еще лучше (tree-shaking в next.config.js):
experimental: {
  optimizePackageImports: ['lucide-react', 'recharts']
}
```

---

### Проблема 4: Cold Start > 3 секунд

**Причина:** Prisma Client инициализация

**Решение:**
- Использовать Prisma Accelerate (платная опция)
- Или: держать 1 функцию "теплой" через cron ping
```bash
# vercel.json
{
  "crons": [{
    "path": "/api/health",
    "schedule": "*/5 * * * *"
  }]
}
```

---

## 📚 Дополнительная документация:

- [VERCEL_QUICK_FIX.md](./VERCEL_QUICK_FIX.md) - Быстрый фикс DATABASE_URL
- [README_PERFORMANCE.md](./README_PERFORMANCE.md) - Что уже сделано
- [PERFORMANCE_OPTIMIZATION.md](./PERFORMANCE_OPTIMIZATION.md) - Полный план
- [Vercel Docs: Performance](https://vercel.com/docs/concepts/functions/serverless-functions/performance)
- [Next.js Docs: Optimizing](https://nextjs.org/docs/app/building-your-application/optimizing)

---

## ✅ Checklist перед деплоем:

- [ ] `DATABASE_URL` содержит `connection_limit=10`
- [ ] `next.config.js` содержит `swcMinify: true`
- [ ] Prisma queries используют `groupBy` где возможно
- [ ] Тяжелые компоненты загружаются динамически
- [ ] API routes имеют `revalidate` где уместно
- [ ] Images используют Next.js `<Image>` компонент
- [ ] Bundle size < 500MB
- [ ] Lighthouse Performance > 80

---

**Готово! 🚀**

Следующий шаг: проверьте DATABASE_URL на Vercel и убедитесь что `connection_limit=10`!

