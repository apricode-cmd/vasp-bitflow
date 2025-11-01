/**
 * User Menu Component
 * 
 * Admin profile menu in sidebar footer with profile link, theme toggle, and logout
 */

'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, LogOut, Settings2 } from 'lucide-react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { useAdminSession } from '@/hooks/useAdminSession';

export function UserMenu(): React.ReactElement {
  const { session, loading } = useAdminSession();
  const router = useRouter();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  if (loading || !session) {
    return (
      <div className="flex items-center gap-3 p-2.5 rounded-lg animate-pulse">
        <div className="h-9 w-9 bg-muted rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-muted rounded w-20" />
          <div className="h-2 bg-muted rounded w-32" />
        </div>
      </div>
    );
  }

  const displayEmail = session.workEmail || session.email;
  const displayName = `${session.firstName} ${session.lastName}`;
  const initials = `${session.firstName.charAt(0)}${session.lastName.charAt(0)}`.toUpperCase();

  const handleLogout = async () => {
    // Admin logout - clear custom session
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push('/admin/auth/login');
    router.refresh();
  };

  const getRoleBadge = () => {
    const role = session.roleCode || session.role;
    if (role === 'SUPER_ADMIN') {
      return <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 font-bold">SUPER</Badge>;
    }
    if (role === 'ADMIN') {
      return <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">ADMIN</Badge>;
    }
    if (role === 'COMPLIANCE') {
      return <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">COMPLIANCE</Badge>;
    }
    if (role === 'TREASURY_APPROVER') {
      return <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">TREASURY</Badge>;
    }
    if (role === 'FINANCE') {
      return <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">FINANCE</Badge>;
    }
    if (role === 'SUPPORT') {
      return <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">SUPPORT</Badge>;
    }
    if (role === 'READ_ONLY') {
      return <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">READ</Badge>;
    }
    return null;
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="w-full outline-none">
          <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-all cursor-pointer group border border-transparent hover:border-border/50">
            <Avatar className="h-9 w-9 border-2 border-primary/20 group-hover:border-primary/40 transition-colors">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold truncate leading-tight">
                  {displayName}
                </p>
                {getRoleBadge()}
              </div>
              <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                {displayEmail}
              </p>
            </div>
            <Settings2 className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="end" side="top" sideOffset={8}>
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{displayName}</p>
                {getRoleBadge()}
              </div>
              <p className="text-xs text-muted-foreground font-normal">{displayEmail}</p>
              {session.jobTitle && (
                <p className="text-xs text-muted-foreground font-normal">{session.jobTitle}</p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <Link href="/admin/profile">
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Profile & Security
            </DropdownMenuItem>
          </Link>

          <DropdownMenuSeparator />
          
          <div className="px-2 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Theme</span>
              <ThemeToggle />
            </div>
          </div>

          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            className="cursor-pointer text-destructive focus:text-destructive"
            onClick={() => setShowLogoutDialog(true)}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You will need to authenticate again to access the admin panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

