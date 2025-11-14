/**
 * KycAddressTab
 * 
 * Displays residential address information
 */

'use client';

import { Card } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import type { KycSessionDetail } from './types';

interface KycAddressTabProps {
  session: KycSessionDetail;
}

export function KycAddressTab({ session }: KycAddressTabProps): JSX.Element {
  const profile = session.profile || session.user.profile;

  const hasAddress = profile && (
    profile.addressStreet ||
    profile.addressCity ||
    profile.addressRegion ||
    profile.addressCountry ||
    profile.addressPostal
  );

  if (!hasAddress) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground text-center">No address information available</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-6 flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        Residential Address
      </h3>

      <div className="space-y-6">
        {/* Street Address */}
        {profile?.addressStreet && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Street Address</p>
            <p className="font-medium">{profile.addressStreet}</p>
          </div>
        )}

        {/* City, Region, Postal Code */}
        <div className="grid md:grid-cols-3 gap-6">
          {profile?.addressCity && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">City</p>
              <p className="font-medium">{profile.addressCity}</p>
            </div>
          )}
          {profile?.addressRegion && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Region / State</p>
              <p className="font-medium">{profile.addressRegion}</p>
            </div>
          )}
          {profile?.addressPostal && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Postal Code</p>
              <p className="font-medium">{profile.addressPostal}</p>
            </div>
          )}
        </div>

        {/* Country */}
        {profile?.addressCountry && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Country</p>
            <p className="font-medium">{profile.addressCountry}</p>
          </div>
        )}

        {/* Full Address Block */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm font-semibold mb-2">Full Address:</p>
          <address className="text-sm not-italic leading-relaxed">
            {profile?.addressStreet && <>{profile.addressStreet}<br /></>}
            {(profile?.addressCity || profile?.addressRegion || profile?.addressPostal) && (
              <>
                {profile?.addressCity}{profile?.addressRegion && `, ${profile.addressRegion}`}{profile?.addressPostal && ` ${profile.addressPostal}`}
                <br />
              </>
            )}
            {profile?.addressCountry}
          </address>
        </div>
      </div>
    </Card>
  );
}

