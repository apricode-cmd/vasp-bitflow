/**
 * Client Header Component
 * 
 * Compact, modern header for client dashboard with notifications
 */

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { 
  LogOut, 
  User, 
  Bell, 
  CreditCard, 
  Shield, 
  Wallet,
  LayoutDashboard,
  Menu,
  X,
  Check,
  Clock,
  AlertCircle,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useState, useEffect } from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useSettings } from '@/components/providers/settings-provider';
import { BrandLogo } from '@/components/features/BrandLogo';
import { toast } from 'sonner';

interface Notification {
  id: string;
  eventKey: string;
  channel: string;
  title: string;
  message: string;
  data?: any;
  actionUrl?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export function ClientHeader(): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { settings, loading: settingsLoading } = useSettings();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications');
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications || []);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setNotificationsLoading(false);
      }
    };

    if (session) {
      fetchNotifications();
      
      // Refresh notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const handleSignOut = async (): Promise<void> => {
    await signOut({ callbackUrl: '/login' });
  };

  const isActive = (path: string): boolean => {
    return pathname === path || pathname.startsWith(path);
  };

  // Navigation links
  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/buy', label: 'Buy Crypto', icon: CreditCard },
    { href: '/orders', label: 'Orders', icon: Package },
    { href: '/wallets', label: 'Wallets', icon: Wallet },
    { href: '/kyc', label: 'KYC', icon: Shield },
    { href: '/notifications', label: 'Notifications', icon: Bell }
  ];

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!session?.user.email) return 'U';
    return session.user.email.substring(0, 2).toUpperCase();
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
        );
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST'
      });
      
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      toast.error('Failed to mark notifications as read');
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      setNotificationsOpen(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Get notification icon based on eventKey
  const getNotificationIcon = (eventKey: string) => {
    if (eventKey.startsWith('ORDER_')) {
      return <Package className="h-4 w-4" />;
    } else if (eventKey.startsWith('KYC_')) {
      return <Shield className="h-4 w-4" />;
    } else if (eventKey.startsWith('PAYMENT_')) {
      return <Wallet className="h-4 w-4" />;
    } else if (eventKey.startsWith('SECURITY_')) {
      return <AlertCircle className="h-4 w-4" />;
    } else if (eventKey.startsWith('SYSTEM_')) {
      return <AlertCircle className="h-4 w-4" />;
    }
    return <Bell className="h-4 w-4" />;
  };

  const getNotificationColor = (eventKey: string) => {
    if (eventKey.startsWith('ORDER_')) {
      return 'text-blue-500';
    } else if (eventKey.startsWith('KYC_')) {
      return 'text-amber-500';
    } else if (eventKey.startsWith('PAYMENT_')) {
      return 'text-green-500';
    } else if (eventKey.startsWith('SECURITY_')) {
      return 'text-red-500';
    } else if (eventKey.startsWith('SYSTEM_')) {
      return 'text-purple-500';
    }
    return 'text-muted-foreground';
  };

  return (
    <header className="bg-card/50 backdrop-blur-xl border-b sticky top-0 z-50 supports-[backdrop-filter]:bg-card/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            {settingsLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="h-8 w-auto max-w-[150px]">
                <BrandLogo size={32} priority />
              </div>
            )}
          </Link>

          {/* Desktop Navigation */}
          {session && (
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                  >
                    <Button
                      variant={isActive(link.href) ? 'secondary' : 'ghost'}
                      size="sm"
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right Section */}
          {session && (
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Notifications */}
              <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold">Notifications</h3>
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllAsRead}
                        className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                      >
                        Mark all as read
                      </Button>
                    )}
                  </div>
                  
                  <ScrollArea className="h-[400px]">
                    {notificationsLoading ? (
                      <div className="p-4 space-y-4">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2 flex-1">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-3 w-2/3" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {notifications.map((notification) => (
                          <button
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`w-full p-4 text-left hover:bg-muted/50 transition ${
                              !notification.isRead ? 'bg-primary/5' : ''
                            }`}
                          >
                            <div className="flex gap-3">
                              <div className={`flex-shrink-0 mt-1 ${getNotificationColor(notification.eventKey)}`}>
                                {getNotificationIcon(notification.eventKey)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-medium text-sm">{notification.title}</p>
                                  {!notification.isRead && (
                                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {new Date(notification.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  
                  {/* Footer with View All link */}
                  {notifications.length > 0 && (
                    <div className="p-3 border-t">
                      <Link href="/notifications" onClick={() => setNotificationsOpen(false)}>
                        <Button variant="ghost" className="w-full text-primary hover:text-primary/80">
                          View All Notifications
                        </Button>
                      </Link>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {/* Mobile Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                  <div className="flex flex-col gap-4 mt-8">
                    {navLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Button
                            variant={isActive(link.href) ? 'secondary' : 'ghost'}
                            className="w-full justify-start gap-2"
                          >
                            <Icon className="h-4 w-4" />
                            {link.label}
                          </Button>
                        </Link>
                      );
                    })}
                  </div>
                </SheetContent>
              </Sheet>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {session.user.email}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        Client Account
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

