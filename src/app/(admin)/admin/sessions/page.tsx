/**
 * Admin Sessions Management Page
 * 
 * View and manage active admin sessions
 * Features:
 * - View own active sessions
 * - View all sessions (SUPER_ADMIN only)
 * - Terminate individual sessions
 * - Force logout from all devices
 */

import { Metadata } from 'next';
import { ActiveSessionsClient } from './_components/ActiveSessionsClient';

export const metadata: Metadata = {
  title: 'Active Sessions | Admin',
  description: 'Manage your active admin sessions',
};

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function AdminSessionsPage() {
  return <ActiveSessionsClient />;
}

