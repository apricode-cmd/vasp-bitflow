# 🌓 Dark Mode Implementation

## Overview

Dark mode has been successfully implemented in the admin dashboard using `next-themes` - the industry standard for Next.js theme management.

## 📦 Installation

```bash
npm install next-themes
```

## 🏗️ Architecture

### 1. Theme Provider (`src/components/providers/theme-provider.tsx`)

Wrapper component for `next-themes` ThemeProvider:

```typescript
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

### 2. Root Layout Configuration

In `src/components/layouts/Providers.tsx`:

```typescript
<ThemeProvider attribute="class" defaultTheme="light" enableSystem>
  <SessionProvider>
    {children}
  </SessionProvider>
</ThemeProvider>
```

**Configuration:**
- `attribute="class"` - Uses class-based theme switching (compatible with Tailwind)
- `defaultTheme="light"` - Default theme is light mode
- `enableSystem` - Respects user's OS theme preference

### 3. Theme Toggle Component (`src/components/ui/theme-toggle.tsx`)

Interactive button with dropdown menu for theme selection:

**Features:**
- Animated sun/moon icons with smooth transitions
- Three options: Light, Dark, System
- Prevents hydration mismatch with mounted state
- Accessible with screen reader support

**Usage:**
```typescript
import { ThemeToggle } from '@/components/ui/theme-toggle';

<ThemeToggle />
```

### 4. Tailwind Configuration

Already configured in `tailwind.config.ts`:

```typescript
const config: Config = {
  darkMode: ['class'],
  // ... rest of config
}
```

### 5. CSS Variables

Dark mode color scheme defined in `src/app/globals.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  /* ... other light mode variables */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  /* ... other dark mode variables */
}
```

## 🎯 Integration Points

### Admin Sidebar

Theme toggle is integrated in the AdminSidebar footer:

**Location:** `src/components/layouts/AdminSidebar.tsx`

```typescript
{/* Theme Toggle */}
<div className="flex items-center justify-between">
  <span className="text-xs font-semibold text-muted-foreground uppercase">
    Theme
  </span>
  <ThemeToggle />
</div>
```

**Position:**
- Below "Pending Actions" section
- Above "System Status" indicator
- Only visible when sidebar is expanded

## 🎨 How It Works

### Theme Switching

1. **User clicks theme toggle** → Opens dropdown menu
2. **Selects theme** → `setTheme()` called from `useTheme` hook
3. **next-themes updates** → Adds/removes `.dark` class on `<html>` element
4. **Tailwind applies styles** → All `dark:` utility classes become active
5. **CSS variables update** → Colors transition smoothly

### Hydration Safety

```typescript
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

if (!mounted) {
  return <Button>...</Button>; // Placeholder during SSR
}
```

This prevents hydration mismatches by ensuring theme UI only renders on client.

## 🎨 Using Dark Mode in Components

### Tailwind Classes

```typescript
// Background colors
<div className="bg-white dark:bg-gray-900">

// Text colors
<p className="text-gray-900 dark:text-gray-100">

// Borders
<div className="border-gray-200 dark:border-gray-700">
```

### CSS Variables

```typescript
// Automatically switches based on theme
<div className="bg-background text-foreground">
<Button className="bg-primary text-primary-foreground">
```

### Programmatic Theme Detection

```typescript
'use client';

import { useTheme } from 'next-themes';

export function MyComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  // theme: 'light' | 'dark' | 'system'
  // resolvedTheme: actual active theme ('light' or 'dark')
  
  return (
    <div>
      Current theme: {resolvedTheme}
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('light')}>Light</button>
    </div>
  );
}
```

## 🚀 Benefits

1. **Zero Flash** - No theme flashing on page load
2. **System Preference** - Respects user's OS settings
3. **Persistent** - Theme saved in localStorage
4. **Type-Safe** - Full TypeScript support
5. **SSR Compatible** - Works with Next.js SSR/SSG
6. **Accessible** - Screen reader support
7. **Performant** - Minimal JavaScript overhead

## 🎯 Theme Options

### 1. Light Mode (Default)
- Clean, professional look
- High contrast for readability
- Primary: Blue (#3b82f6)

### 2. Dark Mode
- Reduced eye strain in low light
- Modern aesthetic
- Primary: Lighter blue (#60a5fa)

### 3. System Mode
- Auto-switches based on OS preference
- Best user experience
- Respects user's global settings

## 📝 Testing

### Manual Testing

1. Open admin dashboard
2. Look for theme toggle in sidebar (bottom section)
3. Click to open dropdown
4. Select different themes:
   - **Light** - should show light background
   - **Dark** - should show dark background
   - **System** - should match OS theme

### Test Cases

- ✅ Theme persists after page refresh
- ✅ Theme persists after logout/login
- ✅ No flash when loading page
- ✅ Icons animate smoothly
- ✅ All components respond to theme change
- ✅ System theme follows OS preference

## 🐛 Troubleshooting

### Theme not applying?

1. Check `Providers.tsx` has `ThemeProvider` wrapper
2. Verify `tailwind.config.ts` has `darkMode: ['class']`
3. Ensure `<html>` has `suppressHydrationWarning` attribute

### Flash of wrong theme?

- Add `suppressHydrationWarning` to `<html>` tag in layout
- Ensure ThemeProvider is high in component tree

### Components not responding?

- Use CSS variables instead of hardcoded colors
- Use Tailwind's `dark:` prefix for dark mode styles
- Verify component uses theme-aware classes

## 📚 Resources

- **next-themes docs**: https://github.com/pacocoursey/next-themes
- **Tailwind dark mode**: https://tailwindcss.com/docs/dark-mode
- **shadcn/ui theming**: https://ui.shadcn.com/docs/dark-mode

## 🔄 Future Enhancements

Potential improvements:

1. **Custom Themes** - Add more color schemes (blue, green, purple)
2. **Theme Editor** - Allow admins to customize colors
3. **Per-Page Themes** - Force specific theme for certain pages
4. **Animations** - Add smooth color transitions
5. **Shortcuts** - Keyboard shortcut to toggle theme (⌘/Ctrl + K)

## ✅ Status

**Current Status:** ✅ Fully Implemented

**Last Updated:** October 26, 2025

**Tested:** ✅ Yes

**Production Ready:** ✅ Yes

