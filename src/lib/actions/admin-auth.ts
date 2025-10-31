/**
 * Server Actions for Admin Authentication
 * 
 * These actions run on the server and handle admin login/logout
 */

'use server';

import { destroyAdminSession } from '@/lib/services/admin-session.service';
import { redirect } from 'next/navigation';

/**
 * Sign out admin (destroy session)
 */
export async function signOutAdmin() {
  try {
    await destroyAdminSession();
    redirect('/admin/auth/login');
  } catch (error) {
    console.error('❌ signOutAdmin error:', error);
    // Still redirect even if error
    redirect('/admin/auth/login');
  }
}

