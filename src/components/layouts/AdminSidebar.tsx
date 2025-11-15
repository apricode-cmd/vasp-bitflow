/**
 * Admin Sidebar Navigation
 * 
 * Enhanced sidebar with better UX, organization, and modern design
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAdminSession } from '@/hooks/useAdminSession';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { 
  LayoutDashboard, Users, ShoppingCart, Settings, CreditCard,
  TrendingUp, Shield, Database, Activity, Coins,
  Wallet, Globe, Key, User, FileText, Scale,
  ChevronDown, ChevronRight, Search,
  ArrowDownCircle, ArrowUpCircle, BookOpen, Plug,
  Bell, Mail, MessageSquare, Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ApricodeLogo } from '@/components/icons/ApricodeLogo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { UserMenu } from '@/components/layouts/UserMenu';
import { NotificationBell } from '@/components/admin/NotificationBell';

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  description?: string;
  badge?: string;
  superAdminOnly?: boolean;
  requiredPermission?: string; // Format: "resource:action" (e.g., "orders:read")
}

interface NavigationSection {
  section: string;
  items: NavigationItem[];
  defaultOpen: boolean;
  priority: 'high' | 'medium' | 'low';
}

const navigation = [
  {
    section: 'Overview',
    items: [
      { 
        name: 'Dashboard', 
        href: '/admin', 
        icon: LayoutDashboard,
        description: 'Analytics & insights'
      }
    ],
    defaultOpen: true,
    priority: 'high'
  },
  {
    section: 'Daily Operations',
    items: [
      { 
        name: 'Users', 
        href: '/admin/users', 
        icon: Users,
        description: 'Customer management',
        requiredPermission: 'users:read'
      },
      { 
        name: 'Orders', 
        href: '/admin/orders', 
        icon: ShoppingCart,
        description: 'Manage all orders',
        badge: 'pending',
        requiredPermission: 'orders:read'
      },
      { 
        name: 'KYC Reviews', 
        href: '/admin/kyc', 
        icon: Shield,
        description: 'Identity verification',
        badge: 'pending',
        requiredPermission: 'kyc:read'
      },
      { 
        name: 'Pay-In', 
        href: '/admin/pay-in', 
        icon: ArrowDownCircle,
        description: 'Incoming fiat payments',
        badge: 'pending',
        requiredPermission: 'finance:read'
      },
      { 
        name: 'Pay-Out', 
        href: '/admin/pay-out', 
        icon: ArrowUpCircle,
        description: 'Outgoing crypto payments',
        badge: 'pending',
        requiredPermission: 'payouts:read'
      },
      { 
        name: 'User Wallets', 
        href: '/admin/user-wallets', 
        icon: Wallet,
        description: 'Customer wallets',
        requiredPermission: 'users:read'
      },
    ],
    defaultOpen: true,
    priority: 'high'
  },
  {
    section: 'Financial Setup',
    items: [
      { 
        name: 'Currencies', 
        href: '/admin/currencies', 
        icon: Database,
        description: 'Crypto & Fiat'
      },
      { 
        name: 'Trading Pairs', 
        href: '/admin/pairs', 
        icon: Coins,
        description: 'Manage trading pairs'
      },
      { 
        name: 'Payment Accounts', 
        href: '/admin/payments', 
        icon: CreditCard,
        description: 'Banks, PSP, Wallets',
        requiredPermission: 'finance:read'
      },
      { 
        name: 'Fees & Pricing', 
        href: '/admin/fees', 
        icon: TrendingUp,
        description: 'Fee profiles'
      },
      { 
        name: 'Blockchain Networks', 
        href: '/admin/blockchains', 
        icon: Globe,
        description: 'ETH, BSC, Polygon, etc.',
        requiredPermission: 'settings:read'
      },
    ],
    defaultOpen: false,
    priority: 'medium'
  },
  {
    section: 'System & Configuration',
    items: [
      { 
        name: 'Settings', 
        href: '/admin/settings', 
        icon: Settings,
        description: 'Brand, SEO, Legal',
        requiredPermission: 'settings:read'
      },
      { 
        name: 'Integrations', 
        href: '/admin/integrations', 
        icon: Plug,
        description: 'APIs & Services'
      },
      { 
        name: 'Email Templates', 
        href: '/admin/email-templates', 
        icon: Mail,
        description: 'Manage email templates',
        requiredPermission: 'settings:read'
      },
      { 
        name: 'Notifications', 
        href: '/admin/notifications', 
        icon: Bell,
        description: 'Admin alerts',
        badge: 'unread'
      },
      { 
        name: 'Legal Documents', 
        href: '/admin/documents', 
        icon: BookOpen,
        description: 'Policies, Terms, Agreements',
        requiredPermission: 'settings:read'
      },
    ],
    defaultOpen: false,
    priority: 'low'
  },
  {
    section: 'Security & Administration',
    items: [
      { 
        name: 'Administrators', 
        href: '/admin/admins', 
        icon: User,
        description: 'Roles & Permissions',
        superAdminOnly: true,
        requiredPermission: 'admins:read'
      },
      { 
        name: 'API Keys', 
        href: '/admin/api-keys', 
        icon: Key,
        description: 'Access tokens',
        requiredPermission: 'api_keys:read'
      },
      { 
        name: 'Audit Logs', 
        href: '/admin/audit', 
        icon: Activity,
        description: 'System activity',
        requiredPermission: 'audit:read'
      },
      { 
        name: 'KYC Form Fields', 
        href: '/admin/kyc-fields', 
        icon: FileText,
        description: 'Configure KYC forms',
        requiredPermission: 'settings:system'
      },
    ],
    defaultOpen: false,
    priority: 'low'
  }
];

export function AdminSidebar(): JSX.Element {
  const pathname = usePathname();
  const { session } = useAdminSession();
  const { hasPermissionByCode, loading: permissionsLoading } = useAdminPermissions();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    navigation.reduce((acc, section) => ({
      ...acc,
      [section.section]: section.defaultOpen
    }), {})
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<{ 
    pendingOrders: number; 
    pendingKyc: number;
    pendingPayIn: number;
    pendingPayOut: number;
    unreadNotifications: number;
  } | null>(null);

  const isSuperAdmin = session?.role === 'SUPER_ADMIN' || session?.roleCode === 'SUPER_ADMIN';

  // Filter navigation items based on role AND permissions
  const filteredByRoleAndPermissions = navigation.map(section => ({
    ...section,
    items: section.items.filter(item => {
      // Super Admin has access to everything
      if (isSuperAdmin) {
        return true;
      }
      
      // Check superAdminOnly flag
      if (item.superAdminOnly && !isSuperAdmin) {
        return false;
      }
      
      // Check required permission
      if (item.requiredPermission && !permissionsLoading) {
        return hasPermissionByCode(item.requiredPermission);
      }
      
      // No permission required, show by default
      return true;
    })
  })).filter(section => section.items.length > 0);

  // Fetch pending counts for badges
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsResponse, notificationsResponse] = await Promise.all([
          fetch('/api/admin/stats?quick=true'),
          fetch('/api/admin/notifications?limit=1') // Just get count
        ]);
        
        const statsData = await statsResponse.json();
        const notificationsData = await notificationsResponse.json();
        
        if (statsData.success) {
          setStats({
            pendingOrders: statsData.data.orders?.pending || 0,
            pendingKyc: statsData.data.kyc?.pending || 0,
            pendingPayIn: statsData.data.payIn?.pending || 0,
            pendingPayOut: statsData.data.payOut?.pending || 0,
            unreadNotifications: notificationsData.unreadCount || 0
          });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const toggleSection = (sectionName: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  // Filter navigation items based on search
  const filteredNavigation = searchQuery
    ? filteredByRoleAndPermissions.map(section => ({
        ...section,
        items: section.items.filter(item =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(section => section.items.length > 0)
    : filteredByRoleAndPermissions;

  const getBadgeCount = (itemName: string): number | null => {
    if (!stats) return null;
    if (itemName === 'Orders') return stats.pendingOrders;
    if (itemName === 'KYC Reviews') return stats.pendingKyc;
    if (itemName === 'Pay In') return stats.pendingPayIn;
    if (itemName === 'Pay Out') return stats.pendingPayOut;
    if (itemName === 'Notifications') return stats.unreadNotifications;
    return null;
  };

  return (
    <aside className={cn(
      "bg-card/70 backdrop-blur-xl flex flex-col h-full transition-all duration-300",
      "shadow-[4px_0_24px_-2px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3)]"
    )}>
      {/* Logo/Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <div className="h-8 w-8 flex items-center justify-center">
              <ApricodeLogo className="text-primary w-full h-full" />
            </div>
            <div>
              <h2 className="text-base font-bold text-primary">
                CryptoExchange
              </h2>
              <p className="text-xs text-muted-foreground">Admin CRM</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border/50">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {filteredNavigation.map((section) => {
            const hasHighPriority = section.priority === 'high';
            
            return (
              <Collapsible
                key={section.section}
                open={openSections[section.section]}
                onOpenChange={() => toggleSection(section.section)}
              >
                <CollapsibleTrigger className={cn(
                  "flex items-center justify-between w-full px-2 py-2 text-xs font-semibold uppercase transition-colors rounded-md",
                  hasHighPriority 
                    ? "text-foreground hover:text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}>
                  <span className={hasHighPriority ? "text-primary" : ""}>
                    {section.section}
                  </span>
                  {openSections[section.section] ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-1 mt-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || 
                                    (item.href !== '/admin' && pathname?.startsWith(item.href));
                    const badgeCount = getBadgeCount(item.name);
                    
                    // Color for Pay-In/Pay-Out icons
                    const iconColorClass = item.name === 'Pay-In' 
                      ? 'text-green-600 dark:text-green-400'
                      : item.name === 'Pay-Out'
                      ? 'text-red-600 dark:text-red-400'
                      : '';

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        )}
                      >
                        <Icon className={cn(
                          "w-5 h-5 shrink-0 transition-transform group-hover:scale-110",
                          isActive ? "drop-shadow" : iconColorClass
                        )} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{item.name}</span>
                            {badgeCount !== null && badgeCount > 0 && (
                              <Badge 
                                variant={isActive ? "secondary" : "default"}
                                className={cn(
                                  "h-5 min-w-5 px-1.5 text-xs font-bold",
                                  isActive && "bg-primary-foreground text-primary"
                                )}
                              >
                                {badgeCount}
                              </Badge>
                            )}
                          </div>
                          {item.description && !isActive && (
                            <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer - User Menu Only */}
      <Separator />
      <div className="p-4">
        <UserMenu />
      </div>
      </aside>
  );
}
