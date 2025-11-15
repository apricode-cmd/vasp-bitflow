/**
 * Order User Tab
 * User profile and KYC information
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  ExternalLink,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface OrderUserTabProps {
  order: {
    user: {
      id: string;
      email: string;
      profile?: {
        firstName: string;
        lastName: string;
        phoneNumber?: string | null;
        country: string;
      } | null;
      kycSession?: {
        status: string;
      } | null;
    };
  };
}

const KYC_STATUS_CONFIG = {
  PENDING: { icon: Clock, label: 'Pending', color: 'bg-yellow-500', textColor: 'text-yellow-700' },
  APPROVED: { icon: CheckCircle, label: 'Approved', color: 'bg-green-500', textColor: 'text-green-700' },
  REJECTED: { icon: XCircle, label: 'Rejected', color: 'bg-red-500', textColor: 'text-red-700' },
  EXPIRED: { icon: AlertCircle, label: 'Expired', color: 'bg-gray-500', textColor: 'text-gray-700' },
};

export function OrderUserTab({ order }: OrderUserTabProps): JSX.Element {
  const { user } = order;
  const profile = user.profile;
  
  const userName = profile 
    ? `${profile.firstName} ${profile.lastName}`
    : user.email;

  const initials = profile
    ? `${profile.firstName[0]}${profile.lastName[0]}`
    : user.email[0].toUpperCase();

  const kycStatus = user.kycSession?.status || 'PENDING';
  const kycConfig = KYC_STATUS_CONFIG[kycStatus as keyof typeof KYC_STATUS_CONFIG] || KYC_STATUS_CONFIG.PENDING;
  const KYCIcon = kycConfig.icon;

  return (
    <div className="space-y-6">
      {/* User Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <h3 className="text-xl font-semibold">{userName}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <Link href={`/admin/users/${user.id}`}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Full Profile
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      {profile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-muted-foreground mt-1" />
              <div className="flex-1 space-y-1">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
            </div>

            {profile.phoneNumber && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-1" />
                  <div className="flex-1 space-y-1">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{profile.phoneNumber}</p>
                  </div>
                </div>
              </>
            )}

            <Separator />
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
              <div className="flex-1 space-y-1">
                <p className="text-xs text-muted-foreground">Country</p>
                <p className="text-sm font-medium">{profile.country}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KYC Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5" />
            KYC Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className={`h-12 w-12 rounded-full ${kycConfig.color} flex items-center justify-center flex-shrink-0`}>
              <KYCIcon className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">KYC Status</h4>
                <Badge variant="outline" className={kycConfig.textColor}>
                  {kycConfig.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {kycStatus === 'APPROVED' && 'User identity has been verified'}
                {kycStatus === 'PENDING' && 'KYC verification is pending review'}
                {kycStatus === 'REJECTED' && 'KYC verification was rejected'}
                {kycStatus === 'EXPIRED' && 'KYC verification has expired'}
              </p>
            </div>
          </div>

          {kycStatus === 'APPROVED' && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium text-green-900">
                  This user can proceed with crypto purchases
                </p>
              </div>
            </div>
          )}

          {kycStatus !== 'APPROVED' && (
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <p className="text-sm font-medium text-orange-900">
                  KYC verification required for processing this order
                </p>
              </div>
            </div>
          )}

          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href={`/admin/kyc?userId=${user.id}`}>
              <Shield className="h-4 w-4 mr-2" />
              View KYC Details
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* User Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">User Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">User ID</p>
              <p className="text-xs font-mono">{user.id}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Profile Status</p>
              <Badge variant="outline" className="text-xs">
                {profile ? 'Complete' : 'Incomplete'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

