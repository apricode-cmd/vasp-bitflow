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
  ArrowDownCircle, ArrowUpCircle, BookOpen
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
    section: 'Core Operations',
    items: [
      { 
        name: 'Orders', 
        href: '/admin/orders', 
        icon: ShoppingCart,
        description: 'Manage all orders',
        badge: 'pending',
        requiredPermission: 'orders:read'
      },
      { 
        name: 'Users', 
        href: '/admin/users', 
        icon: Users,
        description: 'Customer management',
        requiredPermission: 'users:read'
      },
      { 
        name: 'KYC Reviews', 
        href: '/admin/kyc', 
        icon: Shield,
        description: 'Identity verification',
        badge: 'pending',
        requiredPermission: 'kyc:read'
      },
    ],
    defaultOpen: true,
    priority: 'high'
  },
  {
    section: 'Trading',
    items: [
      { 
        name: 'Trading Pairs', 
        href: '/admin/pairs', 
        icon: Coins,
        description: 'Manage trading pairs'
      },
      { 
        name: 'Currencies', 
        href: '/admin/currencies', 
        icon: Database,
        description: 'Crypto & Fiat'
      },
      { 
        name: 'Fees', 
        href: '/admin/fees', 
        icon: TrendingUp,
        description: 'Fee profiles'
      },
    ],
    defaultOpen: false,
    priority: 'medium'
  },
  {
    section: 'Payments & Wallets',
    items: [
      { 
        name: 'Pay In', 
        href: '/admin/pay-in', 
        icon: ArrowDownCircle,
        description: 'Incoming fiat payments',
        badge: 'pending',
        requiredPermission: 'finance:read'
      },
      { 
        name: 'Pay Out', 
        href: '/admin/pay-out', 
        icon: ArrowUpCircle,
        description: 'Outgoing crypto payments',
        badge: 'pending',
        requiredPermission: 'payouts:read'
      },
      { 
        name: 'Payment Accounts', 
        href: '/admin/payments', 
        icon: CreditCard,
        description: 'Banks, Wallets, Methods',
        requiredPermission: 'finance:read'
      },
      { 
        name: 'User Wallets', 
        href: '/admin/user-wallets', 
        icon: Wallet,
        description: 'Customer wallets',
        requiredPermission: 'users:read'
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
    priority: 'high'
  },
  {
    section: 'Legal & Compliance',
    items: [
      { 
        name: 'Legal Library', 
        href: '/admin/documents', 
        icon: BookOpen,
        description: 'Policies, Terms, Agreements',
        requiredPermission: 'settings:read'
      },
    ],
    defaultOpen: false,
    priority: 'medium'
  },
  {
    section: 'System & Settings',
    items: [
      { 
        name: 'Administrators', 
        href: '/admin/admins', 
        icon: Shield,
        description: 'Admin accounts & roles',
        superAdminOnly: true,
        requiredPermission: 'admins:read'
      },
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
        icon: Globe,
        description: 'CoinGecko, KYCAID',
        requiredPermission: 'integrations:read'
      },
      { 
        name: 'KYC Form Fields', 
        href: '/admin/kyc-fields', 
        icon: FileText,
        description: 'Configure KYC fields',
        requiredPermission: 'settings:system'
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
  } | null>(null);

  const isSuperAdmin = session?.role === 'SUPER_ADMIN' || session?.roleCode === 'SUPER_ADMIN';

  // Filter navigation items based on role AND permissions
  const filteredByRoleAndPermissions = navigation.map(section => ({
    ...section,
    items: section.items.filter(item => {
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
        const response = await fetch('/api/admin/stats?quick=true');
        const data = await response.json();
        if (data.success) {
          setStats({
            pendingOrders: data.data.orders?.pending || 0,
            pendingKyc: data.data.kyc?.pending || 0,
            pendingPayIn: data.data.payIn?.pending || 0,
            pendingPayOut: data.data.payOut?.pending || 0
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
    return null;
  };

  return (
    <aside className={cn(
      "bg-card/70 backdrop-blur-xl flex flex-col h-full transition-all duration-300",
      "shadow-[4px_0_24px_-2px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3)]"
    )}>
      {/* Logo/Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
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
                          isActive && "drop-shadow"
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

      {/* Footer Info */}
      <>
        <Separator />
        <div className="p-4 space-y-3">
            {/* Quick Stats */}
            {stats && (stats.pendingOrders > 0 || stats.pendingKyc > 0) && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Pending Actions
                </p>
                <div className="space-y-1">
                  {stats.pendingOrders > 0 && (
                    <Link href="/admin/orders?status=PENDING">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 hover:bg-yellow-100 dark:hover:bg-yellow-950/30 transition-colors cursor-pointer">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                            Orders
                          </span>
                        </div>
                        <Badge variant="warning" className="font-bold">
                          {stats.pendingOrders}
                        </Badge>
                      </div>
                    </Link>
                  )}
                  {stats.pendingKyc > 0 && (
                    <Link href="/admin/kyc?status=PENDING">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            KYC
                          </span>
                        </div>
                        <Badge variant="info" className="font-bold">
                          {stats.pendingKyc}
                        </Badge>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* User Menu */}
            <UserMenu />
          </div>
        </>
      </aside>
  );
}
