/**
 * ProfileSummary Component
 * 
 * Displays user profile information in a card
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCountryFlag, getCountryName } from '@/lib/utils/country-utils';
import { formatDateTime } from '@/lib/formatters';
import { Mail, Phone, MapPin, Calendar, Clock, Key } from 'lucide-react';

interface ProfileSummaryProps {
  user: {
    email: string;
    createdAt: Date;
    lastLogin: Date | null;
    profile: {
      firstName: string;
      lastName: string;
      phoneNumber: string | null;
      country: string;
      city?: string | null;
    } | null;
  };
}

export function ProfileSummary({ user }: ProfileSummaryProps): JSX.Element {
  const infoItems = [
    {
      icon: <Mail className="h-4 w-4" />,
      label: 'Email',
      value: user.email,
    },
    {
      icon: <Phone className="h-4 w-4" />,
      label: 'Phone',
      value: user.profile?.phoneNumber || 'Not provided',
    },
    {
      icon: <MapPin className="h-4 w-4" />,
      label: 'Country',
      value: user.profile?.country 
        ? `${getCountryFlag(user.profile.country)} ${getCountryName(user.profile.country)}` 
        : 'Not provided',
    },
    {
      icon: <MapPin className="h-4 w-4" />,
      label: 'City',
      value: user.profile?.city || 'Not provided',
    },
    {
      icon: <Calendar className="h-4 w-4" />,
      label: 'Joined',
      value: formatDateTime(user.createdAt),
    },
    {
      icon: <Clock className="h-4 w-4" />,
      label: 'Last Login',
      value: user.lastLogin ? formatDateTime(user.lastLogin) : 'Never',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Profile Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {infoItems.map((item, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="text-muted-foreground mt-0.5">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="font-medium truncate">{item.value}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

