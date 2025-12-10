# UI/UX Style Guide - Apricode Exchange CRM

## 📐 Design System Overview

Apricode Exchange использует **современный, премиальный дизайн** в стиле финтех-стартапов и необанков, основанный на **shadcn/ui** и **Tailwind CSS 3.4**.

### Ключевые принципы

- **Modern & Clean**: Минималистичный интерфейс с фокусом на контент
- **Premium Feel**: Glassmorphism, градиенты, плавные анимации
- **Professional**: Строгая типографика, консистентность, внимание к деталям
- **Accessible**: WCAG 2.1 AA compliance, keyboard navigation, screen readers
- **Responsive**: Mobile-first подход, adaptive для всех экранов

---

## 🎨 Color System

### Theme Architecture

Проект использует **CSS Variables** для динамической темы с поддержкой Light/Dark mode.

#### Light Theme (Default)
```css
--background: 0 0% 100%;           /* Pure White #FFFFFF */
--foreground: 222.2 84% 4.9%;      /* Dark Blue #0C1222 */
--primary: 221.2 83.2% 53.3%;      /* Brand Blue #3B82F6 */
--primary-foreground: 210 40% 98%; /* Almost White */
--card: 0 0% 100%;                 /* White */
--muted: 210 40% 96.1%;            /* Light Gray */
--border: 214.3 31.8% 91.4%;       /* Soft Gray Border */
--destructive: 0 84.2% 60.2%;      /* Red #EF4444 */
```

#### Dark Theme
```css
--background: 222.2 84% 4.9%;      /* Dark Blue #0C1222 */
--foreground: 210 40% 98%;         /* Almost White */
--primary: 217.2 91.2% 59.8%;      /* Bright Blue #60A5FA */
--card: 222.2 84% 4.9%;            /* Same as background */
--muted: 217.2 32.6% 17.5%;        /* Dark Gray */
--border: 217.2 32.6% 17.5%;       /* Dark Border */
```

### Brand Colors

- **Primary**: `hsl(var(--primary))` - Основной бренд (синий)
- **Accent**: Bitcoin Orange (#F7931A), Ethereum Purple (#627EEA)
- **Status Colors**:
  - Success: Green (#10B981)
  - Warning: Orange (#F59E0B)
  - Error: Red (#EF4444)
  - Info: Blue (#3B82F6)

### Semantic Usage

```tsx
// Primary Actions
<Button variant="default">Buy Crypto</Button>

// Secondary Actions
<Button variant="outline">View Details</Button>

// Destructive Actions
<Button variant="destructive">Delete Account</Button>

// Status Indicators
<Badge className="bg-green-500">Approved</Badge>
<Badge className="bg-orange-500">Pending</Badge>
<Badge className="bg-red-500">Rejected</Badge>
```

---

## 🖼️ Visual Effects

### 1. Glassmorphism

**Signature effect** проекта - полупрозрачные элементы с blur эффектом.

```tsx
// Utility Classes
className="glass"           // Basic glass effect
className="glass-card"      // Glass card with shadow

// Card Component (default)
<Card>  // Auto includes backdrop-blur-md
  <CardHeader>...</CardHeader>
</Card>

// Custom Glass
className="bg-card/80 backdrop-blur-md border border-border/50"
```

**Где использовать**:
- Cards (по умолчанию)
- Modals / Dialogs
- Navigation Headers
- Floating UI элементы

### 2. Градиенты

#### Background Gradients
```css
/* Body (автоматически) */
body {
  background: radial-gradient(
    ellipse at top left,
    hsl(var(--primary) / 0.4) 0%,
    hsl(var(--primary) / 0.25) 20%,
    hsl(var(--background)) 60%
  );
}
```

#### Utility Gradients
```tsx
// Primary gradient button
className="gradient-primary"  
// from-primary/90 to-primary

// Card gradient background
className="gradient-card"
// from-card to-muted/20

// Border gradient
className="gradient-border"
// from-primary/20 via-primary/50 to-primary/20

// Text gradient
className="text-gradient"
// Blue gradient text
```

**Примеры**:
```tsx
// Hero section
<div className="bg-gradient-to-br from-primary/5 via-background to-primary/10">

// Feature card
<Card className="gradient-card">

// CTA button with glow
<Button className="gradient-primary hover-glow">
```

### 3. Анимации

#### Built-in Animations
```tsx
// Fade in from bottom
className="animate-in"

// Scale in effect
className="animate-scale-in"

// Hover lift effect
className="hover-lift"

// Glow on hover
className="hover-glow"

// Loading shimmer
className="shimmer"
```

#### Animated Blobs (Background)
```tsx
// Client Layout - animated gradient blobs
<div className="absolute top-0 -left-4 w-96 h-96 bg-primary/20 
  rounded-full mix-blend-multiply filter blur-3xl opacity-30 
  animate-blob" />
```

**Animation Principles**:
- **Duration**: 200-300ms для UI interactions
- **Easing**: `ease-out` для появления, `ease-in` для исчезновения
- **Respect**: `prefers-reduced-motion` для accessibility

---

## 📝 Typography

### Font Family

**Inter** - Modern, readable, professional sans-serif.

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 
  'Segoe UI', sans-serif;
font-feature-settings: "rlig" 1, "calt" 1; /* Ligatures */
```

### Type Scale

```tsx
// Headings
<h1 className="text-4xl font-bold">     // Page titles
<h2 className="text-3xl font-semibold"> // Section headers
<h3 className="text-2xl font-semibold"> // Card titles

// Body Text
<p className="text-base">               // Default (16px)
<p className="text-sm">                 // Small (14px)
<p className="text-xs">                 // Tiny (12px)

// Special
<span className="text-muted-foreground"> // Secondary text
<span className="font-mono">             // Code/Numbers
<span className="text-gradient">         // Gradient text
```

### Typography Patterns

```tsx
// Card Title & Description
<CardTitle>Virtual IBAN Account</CardTitle>
<CardDescription>Manage your European bank account</CardDescription>

// Section Header
<div className="flex items-center justify-between mb-6">
  <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
  <Badge>New</Badge>
</div>

// Data Display
<div className="space-y-1">
  <p className="text-sm text-muted-foreground">Balance</p>
  <p className="text-2xl font-bold">€1,234.56</p>
</div>
```

---

## 🧩 Component Patterns

### 1. Button Variants

```tsx
// Primary Action (default)
<Button>Buy Cryptocurrency</Button>

// Secondary Action
<Button variant="outline">View Details</Button>
<Button variant="secondary">Settings</Button>

// Subtle Action
<Button variant="ghost">Cancel</Button>
<Button variant="link">Learn More</Button>

// Danger Action
<Button variant="destructive">Delete Account</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>

// With Icons
<Button>
  <ShoppingCart className="mr-2 h-4 w-4" />
  Buy Now
</Button>

// Loading State
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Processing...
</Button>
```

### 2. Card Patterns

```tsx
// Basic Card
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>

// Stats Card
<Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">142</div>
    <p className="text-xs text-muted-foreground">+12% from last month</p>
  </CardContent>
</Card>

// Interactive Card (Hover)
<Card className="hover-lift cursor-pointer transition-all">
  <CardContent className="p-6">
    <h3 className="font-semibold mb-2">Feature</h3>
    <p className="text-sm text-muted-foreground">Description</p>
  </CardContent>
</Card>

// Glass Card (Premium Look)
<Card className="glass-card">
  <CardContent className="p-8">
    Premium content with glassmorphism
  </CardContent>
</Card>
```

### 3. Badge Patterns

```tsx
// Status Badges
<Badge variant="default">Active</Badge>
<Badge variant="secondary">Pending</Badge>
<Badge variant="destructive">Failed</Badge>
<Badge variant="outline">Draft</Badge>

// Custom Colors
<Badge className="bg-green-500 hover:bg-green-600">Approved</Badge>
<Badge className="bg-orange-500">Pending KYC</Badge>
<Badge className="bg-blue-500">Processing</Badge>

// With Icons
<Badge>
  <CheckCircle2 className="mr-1 h-3 w-3" />
  Verified
</Badge>

// Pill Style
<Badge className="rounded-full">New</Badge>
```

### 4. Form Patterns

```tsx
// Standard Form Field
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input 
    id="email" 
    type="email" 
    placeholder="your@email.com"
  />
  <p className="text-xs text-muted-foreground">
    We'll never share your email
  </p>
</div>

// With Error
<div className="space-y-2">
  <Label htmlFor="amount" className="text-destructive">
    Amount
  </Label>
  <Input 
    id="amount" 
    className="border-destructive"
    placeholder="0.00"
  />
  <p className="text-xs text-destructive">
    Amount must be greater than 0
  </p>
</div>

// With Icon
<div className="relative">
  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
  <Input className="pl-10" placeholder="Email" />
</div>

// React Hook Form + Zod
<form onSubmit={handleSubmit(onSubmit)}>
  <Controller
    name="phone"
    control={control}
    render={({ field }) => (
      <PhoneInput {...field} />
    )}
  />
  {errors.phone && (
    <p className="text-xs text-destructive">{errors.phone.message}</p>
  )}
</form>
```

### 5. Dialog/Modal Patterns

```tsx
// Confirmation Dialog
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. This will permanently delete 
        your account and remove your data from our servers.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction>Continue</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

// Custom Dialog
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Settings</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Edit profile</DialogTitle>
      <DialogDescription>
        Make changes to your profile here.
      </DialogDescription>
    </DialogHeader>
    <div className="grid gap-4 py-4">
      {/* Form fields */}
    </div>
    <DialogFooter>
      <Button type="submit">Save changes</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 6. Table Patterns

```tsx
// Modern Table
<div className="rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>ID</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Amount</TableHead>
        <TableHead className="text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {data.map((item) => (
        <TableRow key={item.id} className="hover:bg-muted/50">
          <TableCell className="font-mono">{item.id}</TableCell>
          <TableCell>
            <Badge variant={getStatusVariant(item.status)}>
              {item.status}
            </Badge>
          </TableCell>
          <TableCell className="font-semibold">
            {formatCurrency(item.amount)}
          </TableCell>
          <TableCell className="text-right">
            <Button variant="ghost" size="sm">View</Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>

// Empty State
{data.length === 0 && (
  <div className="text-center py-12">
    <Package className="mx-auto h-12 w-12 text-muted-foreground" />
    <h3 className="mt-4 text-lg font-semibold">No orders yet</h3>
    <p className="mt-2 text-sm text-muted-foreground">
      Get started by creating your first order
    </p>
    <Button className="mt-4">Create Order</Button>
  </div>
)}
```

---

## 📦 Layout Patterns

### 1. Page Container

```tsx
// Standard Page
export default function Page() {
  return (
    <div className="space-y-6 animate-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Page Title</h1>
          <p className="text-muted-foreground">Page description</p>
        </div>
        <Button>Primary Action</Button>
      </div>

      {/* Page Content */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>...</Card>
        <Card>...</Card>
        <Card>...</Card>
      </div>
    </div>
  );
}
```

### 2. Dashboard Grid

```tsx
// Responsive Dashboard Layout
<div className="space-y-8">
  {/* KPI Cards */}
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <StatsCard title="Total Orders" value="142" icon={ShoppingCart} />
    <StatsCard title="Revenue" value="€12,345" icon={TrendingUp} />
    <StatsCard title="Active Users" value="89" icon={User} />
    <StatsCard title="KYC Pending" value="12" icon={Shield} />
  </div>

  {/* Main Content */}
  <div className="grid gap-6 lg:grid-cols-3">
    {/* Main Column (2/3) */}
    <div className="lg:col-span-2 space-y-6">
      <Card>Recent Orders</Card>
      <Card>Transactions</Card>
    </div>

    {/* Sidebar (1/3) */}
    <div className="space-y-6">
      <Card>Quick Actions</Card>
      <Card>Notifications</Card>
    </div>
  </div>
</div>
```

### 3. Two-Column Layout

```tsx
// Settings / Profile Page
<div className="grid gap-6 lg:grid-cols-[240px_1fr]">
  {/* Sidebar Navigation */}
  <aside className="space-y-2">
    <Button variant="ghost" className="w-full justify-start">
      <User className="mr-2 h-4 w-4" />
      Profile
    </Button>
    <Button variant="ghost" className="w-full justify-start">
      <Shield className="mr-2 h-4 w-4" />
      Security
    </Button>
    <Button variant="ghost" className="w-full justify-start">
      <Bell className="mr-2 h-4 w-4" />
      Notifications
    </Button>
  </aside>

  {/* Main Content */}
  <main className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Form fields */}
      </CardContent>
    </Card>
  </main>
</div>
```

### 4. Tabs Layout

```tsx
// Tabbed Content
<Tabs defaultValue="overview" className="space-y-6">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="transactions">Transactions</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>

  <TabsContent value="overview" className="space-y-4">
    <Card>Overview Content</Card>
  </TabsContent>

  <TabsContent value="transactions" className="space-y-4">
    <Card>Transactions Table</Card>
  </TabsContent>

  <TabsContent value="settings" className="space-y-4">
    <Card>Settings Form</Card>
  </TabsContent>
</Tabs>
```

---

## 🎯 UI States

### 1. Loading States

```tsx
// Page Loading
if (loading) {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

// Button Loading
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isLoading ? 'Processing...' : 'Submit'}
</Button>

// Inline Loading
<BrandLoaderInline text="Loading data..." />

// Card Loading (Shimmer)
<Card className="shimmer">
  <CardContent className="h-32" />
</Card>
```

### 2. Empty States

```tsx
// No Data
<Card>
  <CardContent className="flex flex-col items-center justify-center py-12">
    <Package className="h-16 w-16 text-muted-foreground mb-4" />
    <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
    <p className="text-sm text-muted-foreground text-center mb-4">
      Start by creating your first cryptocurrency order
    </p>
    <Button>
      <Plus className="mr-2 h-4 w-4" />
      Create Order
    </Button>
  </CardContent>
</Card>

// Search No Results
<div className="text-center py-8">
  <Search className="mx-auto h-12 w-12 text-muted-foreground" />
  <p className="mt-4 text-muted-foreground">
    No results found for "{searchQuery}"
  </p>
  <Button variant="link" onClick={clearSearch}>
    Clear search
  </Button>
</div>
```

### 3. Error States

```tsx
// Alert Error
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Failed to load data. Please try again.
  </AlertDescription>
</Alert>

// Inline Error
<div className="rounded-md bg-destructive/10 p-4 border border-destructive/20">
  <div className="flex items-start gap-3">
    <AlertCircle className="h-5 w-5 text-destructive" />
    <div>
      <h4 className="font-semibold text-destructive">
        Payment Failed
      </h4>
      <p className="text-sm text-destructive/80 mt-1">
        Insufficient balance. Please top up your account.
      </p>
    </div>
  </div>
</div>

// Form Field Error
{errors.email && (
  <p className="text-xs text-destructive mt-1">
    {errors.email.message}
  </p>
)}
```

### 4. Success States

```tsx
// Success Toast (Sonner)
import { toast } from 'sonner';

toast.success('Order created successfully!', {
  description: 'You will receive a confirmation email shortly.'
});

// Success Alert
<Alert className="border-green-500 bg-green-50 dark:bg-green-950">
  <CheckCircle2 className="h-4 w-4 text-green-600" />
  <AlertTitle className="text-green-600">Success!</AlertTitle>
  <AlertDescription className="text-green-600">
    Your Virtual IBAN account has been created.
  </AlertDescription>
</Alert>
```

---

## 🔧 Spacing & Layout

### Spacing Scale

```tsx
// Tailwind spacing utilities (based on 4px)
space-y-1   // 4px
space-y-2   // 8px
space-y-4   // 16px
space-y-6   // 24px (default between sections)
space-y-8   // 32px (major sections)
space-y-12  // 48px (page sections)

// Padding
p-4   // Card padding (16px)
p-6   // Default card content (24px)
p-8   // Large card padding (32px)

// Container max widths
max-w-7xl   // Default page container (1280px)
max-w-4xl   // Narrow content (896px)
max-w-sm    // Modals (384px)
```

### Responsive Breakpoints

```tsx
// Tailwind breakpoints
sm:   // 640px
md:   // 768px
lg:   // 1024px
xl:   // 1280px
2xl:  // 1536px

// Usage
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* 1 column on mobile, 2 on tablet, 3 on desktop */}
</div>

<div className="p-4 sm:p-6 lg:p-8">
  {/* Responsive padding */}
</div>
```

---

## 🎬 Transitions & Animations

### Standard Transitions

```tsx
// Button hover
transition-colors duration-200

// Card hover
transition-all duration-300

// Smooth transforms
transform transition-transform duration-200

// Opacity
transition-opacity duration-150
```

### Animation Classes

```tsx
// Fade in on mount
className="animate-in fade-in duration-500"

// Slide in from bottom
className="animate-in slide-in-from-bottom-4 duration-300"

// Scale in
className="animate-scale-in"

// Hover effects
className="hover-lift"       // Lift on hover
className="hover-glow"       // Glow effect
className="hover:scale-105"  // Subtle scale
```

---

## ♿ Accessibility

### Focus Indicators

```tsx
// Global focus ring (автоматически)
*:focus-visible {
  ring-1 ring-primary ring-offset-1
}

// Custom focus
className="focus-visible:ring-2 focus-visible:ring-primary"
```

### ARIA Labels

```tsx
// Button with icon only
<Button aria-label="Close dialog" size="icon">
  <X className="h-4 w-4" />
</Button>

// Link
<Link href="/dashboard" aria-label="Go to dashboard">
  Dashboard
</Link>

// Form
<Label htmlFor="email">Email</Label>
<Input id="email" aria-describedby="email-hint" />
<p id="email-hint" className="text-xs text-muted-foreground">
  We'll never share your email
</p>
```

### Keyboard Navigation

```tsx
// Dialogs - ESC to close (automatic)
<Dialog>...</Dialog>

// Dropdown menus (automatic)
<DropdownMenu>...</DropdownMenu>

// Custom keyboard handler
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Click me
</div>
```

---

## 📱 Mobile Patterns

### Mobile-First Approach

```tsx
// Start with mobile, add desktop features
<div className="
  flex flex-col         // Mobile: stack vertically
  md:flex-row           // Desktop: horizontal
  space-y-4             // Mobile: vertical spacing
  md:space-y-0 md:space-x-4  // Desktop: horizontal spacing
">
  <div>Column 1</div>
  <div>Column 2</div>
</div>

// Responsive text
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
  Responsive Heading
</h1>

// Responsive padding
<Card className="p-4 sm:p-6 lg:p-8">
  Content
</Card>
```

### Touch-Friendly

```tsx
// Minimum 44x44px touch targets
<Button size="default">  // h-10 = 40px + padding
  Tap Here
</Button>

// Larger on mobile
<Button className="h-12 md:h-10">
  Mobile Friendly
</Button>
```

---

## 🧪 Best Practices

### ✅ Do's

1. **Use semantic HTML**
   ```tsx
   <main>, <nav>, <article>, <section>
   ```

2. **Consistent spacing**
   ```tsx
   <div className="space-y-6">  // Between major sections
   <div className="space-y-4">  // Between related items
   ```

3. **Icons with text**
   ```tsx
   <Button>
     <Icon className="mr-2 h-4 w-4" />
     Label
   </Button>
   ```

4. **Loading states**
   ```tsx
   {loading ? <Skeleton /> : <Content />}
   ```

5. **Error boundaries**
   ```tsx
   <ErrorBoundary fallback={<ErrorPage />}>
     <Content />
   </ErrorBoundary>
   ```

### ❌ Don'ts

1. **Avoid inline styles** (use Tailwind classes)
   ```tsx
   ❌ style={{ color: 'red' }}
   ✅ className="text-red-500"
   ```

2. **Don't use `any` type**
   ```tsx
   ❌ const handleClick = (e: any) => {}
   ✅ const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {}
   ```

3. **Don't hardcode colors**
   ```tsx
   ❌ className="bg-[#3B82F6]"
   ✅ className="bg-primary"
   ```

4. **Don't nest too deep**
   ```tsx
   ❌ <div><div><div><div>Content</div></div></div></div>
   ✅ Extract to components
   ```

5. **Don't forget responsive**
   ```tsx
   ❌ className="grid grid-cols-4"
   ✅ className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
   ```

---

## 📚 Component Library

### Available UI Components

**Полный список shadcn/ui компонентов в проекте:**

- `accordion` - Collapsible sections
- `alert` / `alert-dialog` - Notifications & confirmations
- `avatar` - User avatars
- `badge` - Status indicators
- `button` - Primary UI actions
- `calendar` - Date selection
- `card` - Content containers
- `checkbox` / `radio-group` - Form selections
- `command` - Command palette (Cmd+K)
- `dialog` / `sheet` - Modals & slideovers
- `dropdown-menu` / `context-menu` - Contextual menus
- `form` - React Hook Form integration
- `input` / `textarea` - Text inputs
- `label` - Form labels
- `pagination` - Table/list pagination
- `popover` / `tooltip` / `hover-card` - Floating UI
- `progress` - Progress bars
- `scroll-area` - Custom scrollbars
- `select` / `combobox` - Dropdowns
- `separator` - Visual dividers
- `skeleton` - Loading placeholders
- `slider` - Range inputs
- `switch` - Toggle switches
- `table` - Data tables
- `tabs` - Tabbed interfaces
- `theme-toggle` - Dark/Light mode

**Custom Components:**

- `brand-loader` - Branded loading animation
- `copy-button` - Copy to clipboard
- `country-dropdown` - Country selector with flags
- `date-picker` - Calendar + Input
- `phone-input` - International phone input
- `password-generator` - Secure password generator
- `color-picker` - RGB/HSL color picker
- `qr-code` - QR code generator

### Icon Library

**Lucide React** - 1000+ icons

```tsx
import { 
  ShoppingCart, User, Settings, Bell, 
  ChevronRight, X, Check, AlertCircle,
  TrendingUp, Package, Shield, Lock
} from 'lucide-react';

// Usage
<Icon className="h-4 w-4" />           // 16x16px
<Icon className="h-5 w-5" />           // 20x20px
<Icon className="h-6 w-6" />           // 24x24px
<Icon className="text-muted-foreground" />
```

---

## 🎨 Example Compositions

### Banking Card (Premium Style)

```tsx
<Card className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700">
  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
  <CardContent className="relative p-6 space-y-6">
    {/* Card chip */}
    <div className="w-12 h-10 rounded bg-gradient-to-br from-amber-400 to-amber-600" />
    
    {/* IBAN */}
    <div className="space-y-2">
      <p className="text-xs text-slate-400 uppercase tracking-wider">IBAN</p>
      <p className="text-lg font-mono font-semibold text-white tracking-wider">
        DK08 8900 0025 3335 85
      </p>
    </div>
    
    {/* Holder & BIC */}
    <div className="flex items-end justify-between">
      <div>
        <p className="text-xs text-slate-400">Account Holder</p>
        <p className="font-semibold text-white">John Doe</p>
      </div>
      <div className="text-right">
        <p className="text-xs text-slate-400">BIC</p>
        <p className="font-mono text-white">SXPYDKKK</p>
      </div>
    </div>
  </CardContent>
</Card>
```

### Stats Dashboard

```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  {[
    { title: 'Total Revenue', value: '€45,231', change: '+20.1%', icon: TrendingUp },
    { title: 'Orders', value: '142', change: '+12.5%', icon: ShoppingCart },
    { title: 'Active Users', value: '89', change: '+4.2%', icon: User },
    { title: 'Pending KYC', value: '12', change: '-5.1%', icon: Shield }
  ].map((stat) => (
    <Card key={stat.title} className="hover-lift">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {stat.title}
        </CardTitle>
        <stat.icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stat.value}</div>
        <p className="text-xs text-muted-foreground mt-1">
          <span className={stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}>
            {stat.change}
          </span>
          {' '}from last month
        </p>
      </CardContent>
    </Card>
  ))}
</div>
```

---

## 🚀 Getting Started

### Import Component

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
```

### Use Utility Classes

```tsx
<div className="space-y-6 animate-in">
  <Card className="glass-card hover-lift">
    <CardHeader>
      <CardTitle className="text-gradient">
        Premium Title
      </CardTitle>
    </CardHeader>
    <CardContent>
      Content with glassmorphism
    </CardContent>
  </Card>
</div>
```

### Check Dark Mode

```tsx
// Automatic - components adapt to theme
<Card>  // Uses hsl(var(--card))

// Force light/dark
<div className="dark:bg-slate-900 bg-white">
  Content
</div>
```

---

## 📖 Resources

- **Tailwind CSS**: https://tailwindcss.com/docs
- **shadcn/ui**: https://ui.shadcn.com
- **Radix UI**: https://www.radix-ui.com
- **Lucide Icons**: https://lucide.dev
- **class-variance-authority**: https://cva.style

---

**Last Updated**: December 2025  
**Maintained by**: Apricode Development Team




