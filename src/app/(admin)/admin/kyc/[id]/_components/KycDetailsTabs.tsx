/**
 * KycDetailsTabs
 * 
 * Tab navigation for KYC session details
 * Supports: Overview, Personal, Address, Documents, History
 */

'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  MapPin, 
  FileText, 
  Clock,
  LayoutDashboard,
  Layers
} from 'lucide-react';
import type { KycSessionDetail } from './types';
import { KycOverviewTab } from './KycOverviewTab';
import { KycPersonalInfoTab } from './KycPersonalInfoTab';
import { KycAddressTab } from './KycAddressTab';
import { KycDocumentsTab } from './KycDocumentsTab';
import { KycHistoryTab } from './KycHistoryTab';
import { KycAdditionalDataTab } from './KycAdditionalDataTab';

interface KycDetailsTabsProps {
  session: KycSessionDetail;
  onUpdate: () => void;
}

export function KycDetailsTabs({ session, onUpdate }: KycDetailsTabsProps): JSX.Element {
  const additionalDataCount = session.formData?.length || 0;

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4" />
          <span className="hidden sm:inline">Overview</span>
        </TabsTrigger>
        <TabsTrigger value="personal" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Personal</span>
        </TabsTrigger>
        <TabsTrigger value="address" className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span className="hidden sm:inline">Address</span>
        </TabsTrigger>
        <TabsTrigger value="documents" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Documents</span>
        </TabsTrigger>
        <TabsTrigger value="additional" className="flex items-center gap-2">
          <Layers className="h-4 w-4" />
          <span className="hidden sm:inline">Additional</span>
          {additionalDataCount > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {additionalDataCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span className="hidden sm:inline">History</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <KycOverviewTab session={session} onUpdate={onUpdate} />
      </TabsContent>

      <TabsContent value="personal" className="space-y-4">
        <KycPersonalInfoTab session={session} />
      </TabsContent>

      <TabsContent value="address" className="space-y-4">
        <KycAddressTab session={session} />
      </TabsContent>

      <TabsContent value="documents" className="space-y-4">
        <KycDocumentsTab session={session} onUpdate={onUpdate} />
      </TabsContent>

      <TabsContent value="additional" className="space-y-4">
        <KycAdditionalDataTab session={session} />
      </TabsContent>

      <TabsContent value="history" className="space-y-4">
        <KycHistoryTab session={session} />
      </TabsContent>
    </Tabs>
  );
}

