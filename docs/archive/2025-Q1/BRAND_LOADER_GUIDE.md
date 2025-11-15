# Brand Loader System

## 📋 Overview

Унифицированная система загрузки с брендированным лого из настроек системы. Красивая анимация с тремя вращающимися кольцами вокруг логотипа компании.

## 🎨 Features

- ✅ **Auto-themed**: Автоматически использует светлый/темный лого
- ✅ **Animated rings**: 3 кольца с разной скоростью вращения
- ✅ **Responsive sizes**: sm, md, lg, xl
- ✅ **Flexible**: Inline, Full page, Overlay варианты
- ✅ **Fallback**: Градиент если лого не загрузилось
- ✅ **Settings-driven**: Лого из admin/settings

## 🚀 Components

### 1. `<BrandLoader />`
Базовый компонент лоадера

```tsx
import { BrandLoader } from '@/components/ui/brand-loader';

<BrandLoader 
  size="md"           // 'sm' | 'md' | 'lg' | 'xl'
  text="Loading..."   // Optional text
  className=""        // Additional styles
  fullScreen={false}  // Full screen overlay
/>
```

### 2. `<BrandLoaderPage />`
Для полностраничных загрузок (используется в `app/loading.tsx`)

```tsx
import { BrandLoaderPage } from '@/components/ui/brand-loader';

<BrandLoaderPage text="Loading application..." />
```

### 3. `<BrandLoaderInline />`
Для инлайн контента (внутри компонентов)

```tsx
import { BrandLoaderInline } from '@/components/ui/brand-loader';

<BrandLoaderInline 
  size="sm"              // 'sm' | 'md'
  text="Loading data..." // Optional
/>
```

### 4. `<BrandLoaderOverlay />`
Оверлей с блокировкой взаимодействия

```tsx
import { BrandLoaderOverlay } from '@/components/ui/brand-loader';

const [isProcessing, setIsProcessing] = useState(false);

<BrandLoaderOverlay 
  show={isProcessing}
  text="Processing payment..."
/>
```

## 📝 Migration Examples

### Before (Old Loader2):
```tsx
import { Loader2 } from 'lucide-react';

// Full page
<div className="min-h-screen flex items-center justify-center">
  <Loader2 className="h-8 w-8 animate-spin text-primary" />
</div>

// Inline
<div className="flex items-center justify-center py-8">
  <Loader2 className="h-6 w-6 animate-spin" />
  <span className="ml-2">Loading...</span>
</div>

// Button
<Button disabled={loading}>
  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Submit
</Button>
```

### After (Brand Loader):
```tsx
import { BrandLoaderPage, BrandLoaderInline } from '@/components/ui/brand-loader';

// Full page
<BrandLoaderPage text="Loading..." />

// Inline
<BrandLoaderInline text="Loading..." />

// Button (keep Loader2 for buttons - too small for logo)
<Button disabled={loading}>
  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Submit
</Button>
```

## 🎯 Use Cases

### 1. Page Loading
```tsx
// app/dashboard/loading.tsx
import { BrandLoaderPage } from '@/components/ui/brand-loader';

export default function Loading() {
  return <BrandLoaderPage text="Loading dashboard..." />;
}
```

### 2. Data Fetching
```tsx
function MyComponent() {
  const [loading, setLoading] = useState(true);
  
  if (loading) {
    return <BrandLoaderInline text="Fetching data..." />;
  }
  
  return <DataTable data={data} />;
}
```

### 3. Form Submission
```tsx
function MyForm() {
  const [submitting, setSubmitting] = useState(false);
  
  return (
    <>
      <form onSubmit={handleSubmit}>
        {/* form fields */}
      </form>
      
      <BrandLoaderOverlay 
        show={submitting} 
        text="Creating order..." 
      />
    </>
  );
}
```

### 4. Modal Content
```tsx
<Dialog open={open}>
  <DialogContent>
    {loading ? (
      <BrandLoaderInline size="md" text="Loading..." />
    ) : (
      <div>{content}</div>
    )}
  </DialogContent>
</Dialog>
```

## 🔧 Sizes Reference

| Size | Logo Size | Ring Size | Text Size | Use Case |
|------|-----------|-----------|-----------|----------|
| `sm` | 48px | 64px | xs | Inline, Cards |
| `md` | 64px | 80px | sm | Default, Modals |
| `lg` | 96px | 112px | base | Full Page |
| `xl` | 128px | 144px | lg | Hero sections |

## 🎨 Animation Details

### Three Rotating Rings:
1. **Outer ring** - Spins in 3s, clockwise
2. **Middle ring** - Spins in 2s, counter-clockwise
3. **Inner ring** - Spins in 1.5s, clockwise

### Logo Animation:
- Gentle pulse effect (2s interval)
- Stays centered and readable

### Colors:
- Rings use `--primary` CSS variable
- Opacity: 20%, 30%, 40% (outer to inner)
- Auto-adapts to theme changes

## 📦 Settings Integration

Loader automatically fetches logo from:
```
GET /api/settings/public

Response:
{
  "success": true,
  "settings": {
    "brandLogo": "/uploads/logo-light.png",      // Light theme
    "brandLogoDark": "/uploads/logo-dark.png"    // Dark theme
  }
}
```

## 🛠️ Customization

### Custom Animation Speed:
```tsx
<BrandLoader 
  className="[&_.animate-spin]:duration-1000" // Slower rings
/>
```

### Custom Colors:
Use CSS variables in your theme:
```css
:root {
  --primary: 200 100% 50%; /* Custom brand color */
}
```

## ⚠️ Important Notes

1. **Don't use for buttons** - Logo too big, use `Loader2` instead
2. **Auto theme-aware** - No manual theme checks needed
3. **Fallback included** - Gradient shown if logo fails
4. **Performance** - Logo cached by Next.js Image
5. **Accessibility** - Includes proper loading states

## 📊 Migration Status

**Total Loader2 usage**: 127 instances across 57 files

**Recommended replacements**:
- ✅ Full page loaders (12 files) → `BrandLoaderPage`
- ✅ Content loaders (25 files) → `BrandLoaderInline`
- ✅ Modal loaders (8 files) → `BrandLoaderInline`
- ❌ Button loaders (32 files) → Keep `Loader2`

**DO NOT replace**:
- Button loading states (too small)
- Table row loaders (too big)
- Icon-only contexts

## 🎯 Best Practices

1. **Use BrandLoaderPage** for route-level loading
2. **Use BrandLoaderInline** for component-level loading
3. **Use BrandLoaderOverlay** for blocking operations
4. **Keep Loader2** for buttons and small contexts
5. **Add descriptive text** for better UX
6. **Match size to context** (sm for cards, lg for pages)

## 🔄 Future Enhancements

- [ ] Skeleton variants integration
- [ ] Progress percentage display
- [ ] Multiple animation styles
- [ ] Custom ring count
- [ ] Sound effects option

---

**Created**: 2025-11-15  
**Component**: `src/components/ui/brand-loader.tsx`  
**Used in**: `src/app/loading.tsx` (global)

