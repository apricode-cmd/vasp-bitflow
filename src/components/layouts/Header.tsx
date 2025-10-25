/**
 * Header Component
 * 
 * Enhanced navigation header with Breadcrumb, Avatar menu, and Command K search
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { LogOut, User, Settings, Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useState } from 'react';

export function Header(): React.ReactElement {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async (): Promise<void> => {
    await signOut({ callbackUrl: '/' });
  };

  const isActive = (path: string): boolean => {
    return pathname === path || pathname.startsWith(path);
  };

  // Navigation links based on user role
  const navLinks = session?.user.role === 'ADMIN'
    ? [
        { href: '/admin', label: 'Dashboard' },
        { href: '/admin/orders', label: 'Orders' },
        { href: '/admin/kyc', label: 'KYC Reviews' },
        { href: '/admin/settings-v2', label: 'Settings' }
      ]
    : [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/buy', label: 'Buy Crypto' },
        { href: '/orders', label: 'My Orders' },
        { href: '/kyc', label: 'KYC Verification' }
      ];

  // Generate breadcrumbs from pathname
  const generateBreadcrumbs = () => {
    if (!pathname || pathname === '/') return null;
    
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs: { href: string; label: string }[] = [];
    
    let currentPath = '';
    paths.forEach((path, index) => {
      currentPath += `/${path}`;
      
      // Generate readable labels
      let label = path.charAt(0).toUpperCase() + path.slice(1);
      label = label.replace(/-/g, ' ');
      
      breadcrumbs.push({
        href: currentPath,
        label
      });
    });
    
    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!session?.user.email) return 'U';
    return session.user.email.substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-background border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <Link href={session ? (session.user.role === 'ADMIN' ? '/admin' : '/dashboard') : '/'} className="text-xl font-bold text-primary">
              Apricode Exchange
            </Link>
          </div>

          {/* Desktop Navigation */}
          {session && (
            <nav className="hidden md:flex items-center space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition ${
                    isActive(link.href)
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          {/* User Menu */}
          {session ? (
            <div className="flex items-center gap-2">
              {/* Mobile Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <div className="flex flex-col gap-4 mt-8">
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`text-sm font-medium transition ${
                          isActive(link.href)
                            ? 'text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>

              {/* Avatar Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
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
                        {session.user.role === 'ADMIN' ? 'Administrator' : 'Client'}
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
                  {session.user.role === 'ADMIN' && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/settings-v2" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Breadcrumbs - only show for authenticated users */}
        {session && breadcrumbs && breadcrumbs.length > 0 && (
          <div className="py-2 border-t">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href={session.user.role === 'ADMIN' ? '/admin' : '/dashboard'}>
                    Home
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbs.map((crumb, index) => (
                  <div key={crumb.href} className="flex items-center">
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {index === breadcrumbs.length - 1 ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        )}
      </div>
    </header>
  );
}

