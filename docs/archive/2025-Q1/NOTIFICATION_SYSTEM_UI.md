# Notification System - UI & UX Design

## 🎯 Два типа пользователей

### 1. **Client (Клиент)** - получает уведомления
### 2. **Admin (Администратор)** - управляет системой уведомлений

---

## 👤 CLIENT UI (Клиентская часть)

### 1.1. Notification Bell (Header)
```
┌─────────────────────────────────────────────┐
│  Apricode Exchange    🔔(3)  Profile  Logout│
└─────────────────────────────────────────────┘
                         ↓ Click
┌─────────────────────────────────────────────┐
│  Notifications                    Mark all  │
├─────────────────────────────────────────────┤
│  🟢 Order Completed                   2m ago│
│     Your order #APR-123 has been completed │
│     [View Order →]                          │
├─────────────────────────────────────────────┤
│  🔵 Payment Received                 1h ago │
│     Payment for order #APR-122 received    │
│     [View Order →]                          │
├─────────────────────────────────────────────┤
│  ⚪ KYC Approved                     2h ago │
│     Your KYC verification approved!        │
│     [View Details →]                        │
├─────────────────────────────────────────────┤
│  [View All Notifications]                   │
└─────────────────────────────────────────────┘
```

**Компонент:**
```typescript
// src/components/layouts/NotificationBell.tsx

'use client';

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  eventKey: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  
  // Load notifications
  useEffect(() => {
    loadNotifications();
    
    // Poll every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const loadNotifications = async () => {
    const res = await fetch('/api/notifications');
    const data = await res.json();
    setNotifications(data.notifications);
    setUnreadCount(data.notifications.filter(n => !n.isRead).length);
  };
  
  const markAsRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ notificationId: id })
    });
    loadNotifications();
  };
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            Mark all read
          </Button>
        </div>
        
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={() => markAsRead(notification.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-2 border-t">
          <Button variant="ghost" className="w-full" asChild>
            <Link href="/notifications">View All Notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationItem({ notification, onRead }) {
  const getIcon = (eventKey: string) => {
    switch (eventKey) {
      case 'ORDER_CREATED': return <ShoppingCart className="h-4 w-4" />;
      case 'ORDER_COMPLETED': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'KYC_APPROVED': return <Shield className="h-4 w-4 text-green-500" />;
      case 'KYC_REJECTED': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'PAYMENT_RECEIVED': return <DollarSign className="h-4 w-4 text-blue-500" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };
  
  return (
    <div
      className={cn(
        "p-4 hover:bg-accent cursor-pointer transition-colors",
        !notification.isRead && "bg-blue-50 dark:bg-blue-950"
      )}
      onClick={() => {
        onRead();
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
      }}
    >
      <div className="flex gap-3">
        <div className="mt-1">{getIcon(notification.eventKey)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-sm">{notification.title}</p>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
          {notification.actionUrl && (
            <Button variant="link" size="sm" className="p-0 h-auto mt-2">
              View Details →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### 1.2. Notifications Page (`/notifications`)
```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard > Notifications                                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Notifications                          [⚙️ Settings]        │
│                                                               │
│  ┌─ Filters ─────────────────────────────────────────────┐  │
│  │ [All] [Orders] [KYC] [Payments] [Security]            │  │
│  │ [Unread Only ☐]                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🟢 Order Completed                         2m ago    │    │
│  │ ───────────────────────────────────────────────────  │    │
│  │ Your order #APR-123 for 0.05 BTC has been completed.│    │
│  │ The cryptocurrency has been sent to your wallet.     │    │
│  │                                                       │    │
│  │ [View Order]  [Mark as Read]                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🔵 Payment Received                        1h ago    │    │
│  │ ───────────────────────────────────────────────────  │    │
│  │ We received your payment for order #APR-122.         │    │
│  │ Your order is being processed.                       │    │
│  │                                                       │    │
│  │ [View Order]                                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ⚪ KYC Approved                             2h ago    │    │
│  │ ───────────────────────────────────────────────────  │    │
│  │ Congratulations! Your KYC verification has been      │    │
│  │ approved. You can now trade with higher limits.      │    │
│  │                                                       │    │
│  │ [View Details]                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [Load More]                                                  │
└─────────────────────────────────────────────────────────────┘
```

**Компонент:**
```typescript
// src/app/(client)/notifications/page.tsx

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  
  return (
    <div className="container max-w-4xl py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <Button asChild>
          <Link href="/notifications/settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Link>
        </Button>
      </div>
      
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'ORDER' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('ORDER')}
            >
              Orders
            </Button>
            <Button
              variant={filter === 'KYC' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('KYC')}
            >
              KYC
            </Button>
            <Button
              variant={filter === 'PAYMENT' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('PAYMENT')}
            >
              Payments
            </Button>
            <Button
              variant={filter === 'SECURITY' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('SECURITY')}
            >
              Security
            </Button>
            
            <div className="ml-auto">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={unreadOnly}
                  onCheckedChange={setUnreadOnly}
                />
                <span className="text-sm">Unread only</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.map((notification) => (
          <NotificationCard key={notification.id} notification={notification} />
        ))}
      </div>
    </div>
  );
}
```

---

### 1.3. Notification Settings (`/notifications/settings`)
```
┌─────────────────────────────────────────────────────────────┐
│  Notification Settings                                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─ Email Notifications ────────────────────────────────┐   │
│  │                                                        │   │
│  │  Orders                                                │   │
│  │  ☑ Order created                    [Email] [In-App]  │   │
│  │  ☑ Order completed                  [Email] [In-App]  │   │
│  │  ☑ Order cancelled                  [Email] [In-App]  │   │
│  │  ☑ Payment received                 [Email] [In-App]  │   │
│  │                                                        │   │
│  │  KYC Verification                                      │   │
│  │  ☑ KYC approved                     [Email] [In-App]  │   │
│  │  ☑ KYC rejected                     [Email] [In-App]  │   │
│  │  ☑ Additional documents required    [Email] [In-App]  │   │
│  │                                                        │   │
│  │  Security                                              │   │
│  │  ☑ Password changed                 [Email]           │   │
│  │  ☑ Login from new device            [Email]           │   │
│  │  ☑ Suspicious activity detected     [Email] [In-App]  │   │
│  │                                                        │   │
│  │  Marketing (Optional)                                  │   │
│  │  ☐ Newsletter                       [Email]           │   │
│  │  ☐ Special offers                   [Email]           │   │
│  │                                                        │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─ Preferences ──────────────────────────────────────────┐  │
│  │                                                         │  │
│  │  Quiet Hours                                            │  │
│  │  ☑ Enable quiet hours                                  │  │
│  │  From: [22:00] To: [08:00]                             │  │
│  │  Timezone: [Europe/Warsaw ▼]                           │  │
│  │                                                         │  │
│  │  Digest Mode                                            │  │
│  │  ☐ Receive daily digest instead of instant emails      │  │
│  │  Time: [09:00]                                          │  │
│  │                                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  [Save Settings]                                              │
│                                                               │
│  ┌─ Danger Zone ──────────────────────────────────────────┐  │
│  │  [Unsubscribe from all notifications]                   │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Компонент:**
```typescript
// src/app/(client)/notifications/settings/page.tsx

export default function NotificationSettingsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [quietHours, setQuietHours] = useState({ enabled: false, start: '22:00', end: '08:00' });
  
  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-6">Notification Settings</h1>
      
      {/* Email Notifications */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Choose which notifications you want to receive via email and in-app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Orders */}
          <div>
            <h3 className="font-semibold mb-3">Orders</h3>
            <div className="space-y-3">
              <NotificationToggle
                label="Order created"
                eventKey="ORDER_CREATED"
                channels={['EMAIL', 'IN_APP']}
              />
              <NotificationToggle
                label="Order completed"
                eventKey="ORDER_COMPLETED"
                channels={['EMAIL', 'IN_APP']}
              />
              <NotificationToggle
                label="Order cancelled"
                eventKey="ORDER_CANCELLED"
                channels={['EMAIL', 'IN_APP']}
              />
            </div>
          </div>
          
          {/* KYC */}
          <div>
            <h3 className="font-semibold mb-3">KYC Verification</h3>
            <div className="space-y-3">
              <NotificationToggle
                label="KYC approved"
                eventKey="KYC_APPROVED"
                channels={['EMAIL', 'IN_APP']}
              />
              <NotificationToggle
                label="KYC rejected"
                eventKey="KYC_REJECTED"
                channels={['EMAIL', 'IN_APP']}
              />
            </div>
          </div>
          
          {/* Security */}
          <div>
            <h3 className="font-semibold mb-3">Security</h3>
            <div className="space-y-3">
              <NotificationToggle
                label="Password changed"
                eventKey="PASSWORD_CHANGED"
                channels={['EMAIL']}
                locked={true}
              />
              <NotificationToggle
                label="Login from new device"
                eventKey="LOGIN_NEW_DEVICE"
                channels={['EMAIL']}
                locked={true}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Preferences */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quiet Hours */}
          <div>
            <label className="flex items-center gap-2 mb-3">
              <Checkbox
                checked={quietHours.enabled}
                onCheckedChange={(checked) => 
                  setQuietHours({ ...quietHours, enabled: checked })
                }
              />
              <span className="font-medium">Enable quiet hours</span>
            </label>
            
            {quietHours.enabled && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center gap-2">
                  <Label>From:</Label>
                  <Input type="time" value={quietHours.start} className="w-32" />
                  <Label>To:</Label>
                  <Input type="time" value={quietHours.end} className="w-32" />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={unsubscribeAll}>
            Unsubscribe from all notifications
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationToggle({ label, eventKey, channels, locked = false }) {
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-4">
        {channels.includes('EMAIL') && (
          <label className="flex items-center gap-2">
            <Checkbox
              checked={emailEnabled}
              onCheckedChange={setEmailEnabled}
              disabled={locked}
            />
            <Mail className="w-4 h-4" />
            <span className="text-sm">Email</span>
            {locked && <Lock className="w-3 h-3 text-muted-foreground" />}
          </label>
        )}
        {channels.includes('IN_APP') && (
          <label className="flex items-center gap-2">
            <Checkbox
              checked={inAppEnabled}
              onCheckedChange={setInAppEnabled}
            />
            <Bell className="w-4 h-4" />
            <span className="text-sm">In-App</span>
          </label>
        )}
      </div>
    </div>
  );
}
```

---

## 👨‍💼 ADMIN UI (Административная часть)

### 2.1. Notification Management (`/admin/notifications`)
```
┌─────────────────────────────────────────────────────────────┐
│  Notification System                                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [📋 Events] [📧 Email Templates] [📊 Queue] [📈 Analytics] │
│                                                               │
│  ═══════════════════════════════════════════════════════════ │
│                                                               │
│  Events                                      [+ Create Event]│
│                                                               │
│  ┌─ Stats ────────────────────────────────────────────────┐ │
│  │  📊 Total Events: 15    ✅ Active: 12    ⏸️ Inactive: 3 │ │
│  │  📧 Sent Today: 234     ❌ Failed: 5     ⏳ Pending: 12 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  [All] [Orders] [KYC] [Payments] [Security] [System]        │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Event                  Category  Channels   Status  •••  ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ Order Created          ORDER     📧 📱      ✅      [⚙️] ││
│  │ ORDER_CREATED                                            ││
│  │ Sent: 1,234 | Failed: 5 | Last: 2m ago                  ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ Order Completed        ORDER     📧 📱      ✅      [⚙️] ││
│  │ ORDER_COMPLETED                                          ││
│  │ Sent: 892 | Failed: 2 | Last: 5m ago                    ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ KYC Approved           KYC       📧 📱      ✅      [⚙️] ││
│  │ KYC_APPROVED                                             ││
│  │ Sent: 156 | Failed: 0 | Last: 1h ago                    ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ Password Changed       SECURITY  📧         🔒      [⚙️] ││
│  │ PASSWORD_CHANGED                                         ││
│  │ Sent: 45 | Failed: 1 | Last: 3h ago                     ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Компонент:**
```typescript
// src/app/(admin)/admin/notifications/page.tsx

export default function AdminNotificationsPage() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState('all');
  
  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Notification System</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </div>
      
      {/* Tabs */}
      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="events">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <StatsCard
              title="Total Events"
              value={stats.totalEvents}
              icon={<FileText />}
            />
            <StatsCard
              title="Sent Today"
              value={stats.sentToday}
              icon={<Send />}
              trend="+12%"
            />
            <StatsCard
              title="Failed"
              value={stats.failed}
              icon={<AlertCircle />}
              variant="destructive"
            />
            <StatsCard
              title="Pending"
              value={stats.pending}
              icon={<Clock />}
            />
          </div>
          
          {/* Events Table */}
          <Card>
            <CardContent className="p-6">
              <DataTable
                columns={eventColumns}
                data={events}
                filters={[
                  { key: 'category', label: 'Category', options: categories }
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

### 2.2. Event Editor Dialog
```
┌─────────────────────────────────────────────────────────────┐
│  Edit Event: Order Created                          [✕]     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Basic Information                                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Event Key *                                              ││
│  │ [ORDER_CREATED                                    ]      ││
│  │                                                          ││
│  │ Name *                                                   ││
│  │ [Order Created                                    ]      ││
│  │                                                          ││
│  │ Description                                              ││
│  │ [Triggered when a new order is created            ]      ││
│  │                                                          ││
│  │ Category *                                               ││
│  │ [ORDER ▼]                                                ││
│  │                                                          ││
│  │ Priority                                                 ││
│  │ [NORMAL ▼]                                               ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  Channels                                                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ☑ Email                                                  ││
│  │ ☑ In-App                                                 ││
│  │ ☐ SMS (Coming soon)                                      ││
│  │ ☐ Push (Coming soon)                                     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  Email Template (Optional)                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [Select template ▼]                                      ││
│  │                                                          ││
│  │ Or use default content                                   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  Status                                                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ☑ Active                                                 ││
│  │ ☑ System Event (cannot be deleted)                      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  [Cancel]                                    [Save Changes]  │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.3. Queue Monitor (`/admin/notifications/queue`)
```
┌─────────────────────────────────────────────────────────────┐
│  Notification Queue                                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [⏸️ Pending: 12] [🔄 Processing: 3] [✅ Sent: 234] [❌ Failed: 5]│
│                                                               │
│  Auto-refresh: [ON ▼]  Last updated: 2 seconds ago          │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ID      Event           Recipient      Status  Attempts ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ #1234   ORDER_CREATED   user@mail.com  ⏳ PENDING    0  ││
│  │         Scheduled: now                          [Retry] ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ #1233   KYC_APPROVED    john@mail.com  🔄 PROCESSING 1  ││
│  │         Started: 5s ago                         [View]  ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ #1232   ORDER_COMPLETED jane@mail.com  ✅ SENT       1  ││
│  │         Sent: 2m ago                            [View]  ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ #1231   PASSWORD_RESET  bob@mail.com   ❌ FAILED     3  ││
│  │         Error: SMTP timeout                     [Retry] ││
│  │         Last attempt: 10m ago                   [Delete]││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  [Retry All Failed]  [Clear Completed]                       │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.4. Analytics Dashboard (`/admin/notifications/analytics`)
```
┌─────────────────────────────────────────────────────────────┐
│  Notification Analytics                                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [Last 7 days ▼]  [All Events ▼]  [Export CSV]              │
│                                                               │
│  ┌─ Overview ──────────────────────────────────────────────┐│
│  │  📊 Total Sent: 1,234    ✅ Delivered: 1,189 (96.4%)   ││
│  │  ❌ Failed: 45 (3.6%)    📧 Open Rate: 67.8%           ││
│  │  🖱️ Click Rate: 23.4%   ⏱️ Avg. Delivery: 2.3s       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌─ Sent Over Time ────────────────────────────────────────┐│
│  │                                                          ││
│  │  200│     ╭─╮                                           ││
│  │  150│   ╭─╯ ╰╮    ╭─╮                                   ││
│  │  100│ ╭─╯    ╰─╮╭─╯ ╰╮                                  ││
│  │   50│─╯        ╰╯    ╰─                                 ││
│  │     └────────────────────────────────────               ││
│  │      Mon Tue Wed Thu Fri Sat Sun                        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌─ By Event Type ─────────────────────────────────────────┐│
│  │  Event              Sent    Delivered  Failed  Open Rate││
│  │  ORDER_CREATED      456     445        11      72.3%    ││
│  │  ORDER_COMPLETED    234     230        4       81.2%    ││
│  │  KYC_APPROVED       89      89         0       65.4%    ││
│  │  PASSWORD_CHANGED   45      43         2       45.6%    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌─ By Channel ────────────────────────────────────────────┐│
│  │  📧 Email: 1,234 (85%)    📱 In-App: 1,456 (100%)      ││
│  │  📱 SMS: 0 (0%)           🔔 Push: 0 (0%)              ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 White-Label Support

### BrandSettings Integration
```typescript
// src/lib/services/notification-content.service.ts

class NotificationContentService {
  async renderEmail(eventKey: string, data: any, userId?: string): Promise<{
    subject: string;
    html: string;
  }> {
    // Get brand settings for user's organization
    const brandSettings = await this.getBrandSettings(userId);
    
    // Render with brand colors, logo, etc.
    return {
      subject: this.renderSubject(eventKey, data, brandSettings),
      html: this.renderHtml(eventKey, data, brandSettings)
    };
  }
  
  private async getBrandSettings(userId?: string): Promise<BrandSettings> {
    if (!userId) {
      return this.getDefaultBrandSettings();
    }
    
    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: { include: { brandSettings: true } } }
    });
    
    return user?.organization?.brandSettings || this.getDefaultBrandSettings();
  }
  
  private renderHtml(eventKey: string, data: any, brand: BrandSettings): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: ${brand.emailFont}; }
            .header { background: ${brand.primaryColor}; color: white; }
            .button { background: ${brand.primaryColor}; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${brand.emailLogoUrl}" alt="${brand.brandName}" />
          </div>
          <div class="content">
            ${this.getEventContent(eventKey, data)}
          </div>
          <div class="footer">
            <p>${brand.footerText}</p>
            <p>${brand.companyName} | ${brand.companyAddress}</p>
            <a href="${this.getUnsubscribeUrl(data.userId)}">Unsubscribe</a>
          </div>
        </body>
      </html>
    `;
  }
}
```

---

## 📱 Mobile Responsive

### Mobile Notification Bell
```
┌─────────────────┐
│ ☰  Exchange  🔔3│
└─────────────────┘
         ↓ Tap
┌─────────────────┐
│ Notifications   │
│ ───────────────│
│ 🟢 Order Done   │
│ #APR-123        │
│ 2m ago          │
│ ───────────────│
│ 🔵 Payment OK   │
│ #APR-122        │
│ 1h ago          │
│ ───────────────│
│ View All        │
└─────────────────┘
```

---

## ✅ Итого: UI Components

### Client Side (5 компонентов):
1. ✅ `NotificationBell` - колокольчик в header
2. ✅ `NotificationItem` - элемент уведомления
3. ✅ `NotificationsPage` - страница всех уведомлений
4. ✅ `NotificationSettingsPage` - настройки
5. ✅ `NotificationToggle` - переключатель канала

### Admin Side (6 компонентов):
1. ✅ `AdminNotificationsPage` - главная страница
2. ✅ `EventsTable` - таблица событий
3. ✅ `EventEditorDialog` - редактор события
4. ✅ `QueueMonitor` - монитор очереди
5. ✅ `AnalyticsDashboard` - аналитика
6. ✅ `EmailTemplateEditor` - редактор шаблонов (Phase 2)

---

**Начинаем реализацию UI после того как сделаем backend?** 🚀

