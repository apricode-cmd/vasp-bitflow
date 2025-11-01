/**
 * Admin Session Hook
 * 
 * Custom hook to get admin session data from custom JWT session
 */

'use client';

import { useState, useEffect } from 'react';

export interface AdminSessionData {
  id: string;
  email: string;
  workEmail?: string;
  firstName: string;
  lastName: string;
  role: string;
  roleCode?: string;
  authMethod: string;
}

export function useAdminSession() {
  const [session, setSession] = useState<AdminSessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      const response = await fetch('/api/admin/session');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.admin) {
          setSession(data.admin);
        }
      }
    } catch (error) {
      console.error('Failed to fetch admin session:', error);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    fetchSession();
  };

  return { session, loading, refresh };
}

