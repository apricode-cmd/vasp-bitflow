/**
 * Admin Session Hook
 * 
 * Custom hook for admin client components to check session
 * Uses /api/admin/session instead of /api/auth/session
 */

'use client';

import { useEffect, useState } from 'react';

export interface AdminSessionData {
  adminId: string;
  email: string;
  role: string;
  name: string;
}

export interface UseAdminSessionReturn {
  session: AdminSessionData | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
}

export function useAdminSession(): UseAdminSessionReturn {
  const [session, setSession] = useState<AdminSessionData | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  useEffect(() => {
    let isMounted = true;

    const fetchSession = async () => {
      try {
        const response = await fetch('/api/admin/session');
        
        if (!isMounted) return;

        if (response.ok) {
          const data = await response.json();
          if (data.session) {
            setSession(data.session);
            setStatus('authenticated');
          } else {
            setSession(null);
            setStatus('unauthenticated');
          }
        } else {
          setSession(null);
          setStatus('unauthenticated');
        }
      } catch (error) {
        console.error('Failed to fetch admin session:', error);
        if (isMounted) {
          setSession(null);
          setStatus('unauthenticated');
        }
      }
    };

    fetchSession();

    // Poll every 5 minutes to keep session fresh
    const interval = setInterval(fetchSession, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { session, status };
}
