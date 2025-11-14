/**
 * KycTab Component
 * 
 * Displays complete KYC information:
 * - Status, dates, review info
 * - Personal information (name, DOB, nationality, etc.)
 * - Address information
 * - Identity document details
 * - PEP status
 * - Employment & source of funds
 * - Link to full KYC review page
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { KycStatusBadge } from '@/components/features/KycStatusBadge';
import { formatDateTime } from '@/lib/formatters';
import { getCountryFlag, getCountryName } from '@/lib/utils/country-utils';
import { Shield, User, MapPin, FileText, Briefcase, DollarSign, ArrowRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import type { KycStatus } from '@prisma/client';

interface KycTabProps {
  user: {
    id: string;
    kycSession: {
      status: KycStatus;
      submittedAt: string | null;
      reviewedAt: string | null;
    } | null;
    profile: {
      firstName: string;
      lastName: string;
      dateOfBirth?: string | null;
      placeOfBirth?: string | null;
      nationality?: string | null;
      phoneNumber?: string | null;
      addressStreet?: string | null;
      addressCity?: string | null;
      addressRegion?: string | null;
      addressPostalCode?: string | null;
      addressCountry?: string | null;
      idType?: string | null;
      idNumber?: string | null;
      idIssuingCountry?: string | null;
      idIssueDate?: string | null;
      idExpiryDate?: string | null;
      isPep?: boolean | null;
      pepRole?: string | null;
      employmentStatus?: string | null;
      occupation?: string | null;
      employerName?: string | null;
      sourceOfFunds?: string | null;
      sourceOfWealth?: string | null;
      purposeOfAccount?: string | null;
      intendedUse?: string | null;
    } | null;
  };
}

export function KycTab({ user }: KycTabProps): JSX.Element {
  if (!user.kycSession) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">KYC Not Started</h3>
            <p className="text-sm text-muted-foreground">
              This user has not submitted KYC verification yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { kycSession, profile } = user;

  return (
    <div className="space-y-6">
      {/* KYC Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>KYC Verification Status</CardTitle>
              <CardDescription>Identity verification details</CardDescription>
            </div>
            <Link href={`/admin/kyc/${kycSession.id}`}>
              <Button>
                Full Review
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Status</span>
            <KycStatusBadge status={kycSession.status} />
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Submitted</p>
              <p className="font-medium">
                {kycSession.submittedAt 
                  ? formatDateTime(new Date(kycSession.submittedAt))
                  : 'Not submitted'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reviewed</p>
              <p className="font-medium">
                {kycSession.reviewedAt 
                  ? formatDateTime(new Date(kycSession.reviewedAt))
                  : 'Pending review'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Full Name</p>
            <p className="font-medium">
              {profile?.firstName} {profile?.lastName}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Date of Birth</p>
            <p className="font-medium">
              {profile?.dateOfBirth || 'Not provided'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Place of Birth</p>
            <p className="font-medium">
              {profile?.placeOfBirth || 'Not provided'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Nationality</p>
            <p className="font-medium">
              {profile?.nationality 
                ? `${getCountryFlag(profile.nationality)} ${getCountryName(profile.nationality)}`
                : 'Not provided'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone Number</p>
            <p className="font-medium font-mono">
              {profile?.phoneNumber || 'Not provided'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Address Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            <CardTitle className="text-lg">Address Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground">Street Address</p>
            <p className="font-medium">
              {profile?.addressStreet || 'Not provided'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">City</p>
            <p className="font-medium">
              {profile?.addressCity || 'Not provided'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Region/State</p>
            <p className="font-medium">
              {profile?.addressRegion || 'Not provided'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Postal Code</p>
            <p className="font-medium font-mono">
              {profile?.addressPostalCode || 'Not provided'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Country</p>
            <p className="font-medium">
              {profile?.addressCountry 
                ? `${getCountryFlag(profile.addressCountry)} ${getCountryName(profile.addressCountry)}`
                : 'Not provided'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Identity Document */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle className="text-lg">Identity Document</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Document Type</p>
            <p className="font-medium">
              {profile?.idType || 'Not provided'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Document Number</p>
            <p className="font-medium font-mono">
              {profile?.idNumber || 'Not provided'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Issuing Country</p>
            <p className="font-medium">
              {profile?.idIssuingCountry 
                ? `${getCountryFlag(profile.idIssuingCountry)} ${getCountryName(profile.idIssuingCountry)}`
                : 'Not provided'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Issue Date</p>
            <p className="font-medium">
              {profile?.idIssueDate || 'Not provided'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Expiry Date</p>
            <p className="font-medium">
              {profile?.idExpiryDate || 'Not provided'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* PEP Status */}
      {profile?.isPep && (
        <Card className="border-yellow-500 dark:border-yellow-600">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-lg">Politically Exposed Person (PEP)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="warning">PEP Identified</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Role/Position</p>
              <p className="font-medium">
                {profile.pepRole || 'Not specified'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employment & Financial */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            <CardTitle className="text-lg">Employment & Financial Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Employment Status</p>
            <p className="font-medium">
              {profile?.employmentStatus || 'Not provided'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Occupation</p>
            <p className="font-medium">
              {profile?.occupation || 'Not provided'}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground">Employer Name</p>
            <p className="font-medium">
              {profile?.employerName || 'Not provided'}
            </p>
          </div>

          <Separator className="md:col-span-2" />

          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground">Source of Funds</p>
            <p className="font-medium">
              {profile?.sourceOfFunds || 'Not provided'}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground">Source of Wealth</p>
            <p className="font-medium">
              {profile?.sourceOfWealth || 'Not provided'}
            </p>
          </div>

          <Separator className="md:col-span-2" />

          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground">Purpose of Account</p>
            <p className="font-medium">
              {profile?.purposeOfAccount || 'Not provided'}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground">Intended Use</p>
            <p className="font-medium">
              {profile?.intendedUse || 'Not provided'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

