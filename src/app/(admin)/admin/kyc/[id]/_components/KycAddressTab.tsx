/**
 * KycAddressTab
 * 
 * Displays residential address information from profile or formData
 */

'use client';

import { Card } from '@/components/ui/card';
import { MapPin, AlertCircle } from 'lucide-react';
import type { KycSessionDetail } from './types';

interface KycAddressTabProps {
  session: KycSessionDetail;
}

export function KycAddressTab({ session }: KycAddressTabProps): JSX.Element {
  const profile = session.profile || session.user.profile;
  
  // Helper to get field value from formData
  const getFormDataValue = (fieldName: string): string | null => {
    const field = session.formData?.find(f => f.fieldName === fieldName);
    return field?.fieldValue || null;
  };

  // Get address data from profile or formData
  const addressStreet = profile?.addressStreet || getFormDataValue('address_street');
  const addressCity = profile?.addressCity || getFormDataValue('address_city');
  const addressRegion = profile?.addressRegion || getFormDataValue('address_region');
  const addressCountry = profile?.addressCountry || getFormDataValue('address_country');
  const addressPostal = profile?.addressPostal || getFormDataValue('address_postal');

  const hasAddress = addressStreet || addressCity || addressRegion || addressCountry || addressPostal;

  if (!hasAddress) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">No address information available</p>
          <p className="text-xs text-muted-foreground mt-2">
            Address data has not been submitted or is incomplete.
          </p>
        </div>
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
        {addressStreet && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Street Address</p>
            <p className="font-medium">{addressStreet}</p>
          </div>
        )}

        {/* City, Region, Postal Code */}
        <div className="grid md:grid-cols-3 gap-6">
          {addressCity && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">City</p>
              <p className="font-medium">{addressCity}</p>
            </div>
          )}
          {addressRegion && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Region / State</p>
              <p className="font-medium">{addressRegion}</p>
            </div>
          )}
          {addressPostal && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Postal Code</p>
              <p className="font-medium">{addressPostal}</p>
            </div>
          )}
        </div>

        {/* Country */}
        {addressCountry && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Country</p>
            <p className="font-medium">{addressCountry}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
