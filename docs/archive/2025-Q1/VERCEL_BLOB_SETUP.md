# 📦 Vercel Blob Storage Setup

## Что это?

Vercel Blob - это хранилище файлов для Vercel, аналог AWS S3. Используется для загрузки логотипа в production, т.к. Vercel имеет **read-only filesystem**.

## Локальная разработка

В режиме `development` файлы сохраняются в `/public/uploads/` и работают без дополнительной настройки.

## Production Setup

### 1. Создай Blob Store в Vercel

1. Открой [Vercel Dashboard](https://vercel.com/dashboard)
2. Выбери свой проект
3. Перейди в **Storage** → **Create Database**
4. Выбери **Blob**
5. Создай новое хранилище

### 2. Получи токен

После создания хранилища Vercel автоматически добавит переменную окружения:

```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

### 3. Проверь переменные в Vercel

Перейди в **Settings** → **Environment Variables** и убедись, что `BLOB_READ_WRITE_TOKEN` установлен.

### 4. Редеплой проекта

```bash
git push origin main
```

Vercel автоматически подтянет новую переменную.

## Как это работает?

### Development (локально)
```typescript
// Сохраняет в /public/uploads/logo-123456789.svg
logoUrl = "/uploads/logo-123456789.svg"
```

### Production (Vercel)
```typescript
// Загружает в Vercel Blob
logoUrl = "https://xyz123.public.blob.vercel-storage.com/logo-123456789.svg"
```

## API Reference

### Upload Logo
```bash
POST /api/admin/settings/upload-logo
Content-Type: multipart/form-data

FormData:
  logo: File (PNG, JPG, SVG, WebP, max 2MB)

Response:
{
  "success": true,
  "logoUrl": "https://...",
  "filename": "logo-123456789.svg",
  "storage": "vercel-blob" | "local"
}
```

## Цены

- **Бесплатно**: 500MB хранилища + 1GB трафика/месяц
- **Pro**: $0.15/GB хранилища + $0.30/GB трафика

Для логотипа (обычно <100KB) это практически бесплатно.

## Альтернативы

Если не хочешь использовать Vercel Blob, можно использовать:

1. **Supabase Storage** (уже используем для БД)
2. **AWS S3**
3. **Cloudflare R2** (дешевле S3)

---

**Важно**: В production без `BLOB_READ_WRITE_TOKEN` загрузка логотипа вернёт ошибку `500`.

