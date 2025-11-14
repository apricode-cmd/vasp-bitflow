/**
 * KycOverviewTab
 * 
 * Overview of KYC session with key information and quick actions
 */

'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { KycStatusBadge } from '@/components/features/KycStatusBadge';
import { formatDateTime } from '@/lib/formatters';
import { 
  User, 
  Mail, 
  Phone, 
  Globe, 
  Calendar,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import type { KycSessionDetail } from './types';
import { KycProviderInfo } from './KycProviderInfo';
import { KycRiskAssessment } from './KycRiskAssessment';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface KycOverviewTabProps {
  session: KycSessionDetail;
  onUpdate: () => void;
}

export function KycOverviewTab({ session, onUpdate }: KycOverviewTabProps): JSX.Element {
  const profile = session.profile || session.user.profile;

  return (
    <div className="grid gap-6">
      {/* Status & Provider */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Status Card */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Verification Status
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Status</p>
              <KycStatusBadge status={session.status} />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Submitted</p>
                <p className="font-medium">
                  {session.submittedAt ? formatDateTime(session.submittedAt) : 'Not submitted'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Reviewed</p>
                <p className="font-medium">
                  {session.reviewedAt ? formatDateTime(session.reviewedAt) : 'Pending'}
                </p>
              </div>
            </div>
            {session.rejectionReason && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Rejection Reason</p>
                  <p className="text-sm bg-destructive/10 text-destructive p-3 rounded-md">
                    {session.rejectionReason}
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Provider Info */}
        <KycProviderInfo session={session} />
      </div>

      {/* User Information */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <User className="h-4 w-4" />
          User Information
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">
                  {profile?.firstName} {profile?.lastName}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium font-mono text-sm">{session.user.email}</p>
              </div>
            </div>
            {profile?.phoneNumber && (
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">
                    {profile.phoneCountry && `+${profile.phoneCountry} `}
                    {profile.phoneNumber || profile.phone}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-4">
            {profile?.nationality && (
              <div className="flex items-start gap-3">
                <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Nationality</p>
                  <p className="font-medium">{profile.nationality}</p>
                </div>
              </div>
            )}
            {profile?.country && (
              <div className="flex items-start gap-3">
                <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Country</p>
                  <p className="font-medium">{profile.country}</p>
                </div>
              </div>
            )}
            {profile?.dateOfBirth && (
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">
                    {new Date(profile.dateOfBirth).toLocaleDateString('en-GB')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <Separator className="my-4" />
        <div className="flex justify-end">
          <Link href={`/admin/users/${session.userId}`}>
            <Button variant="outline" size="sm">
              <User className="h-4 w-4 mr-2" />
              View Full Profile
            </Button>
          </Link>
        </div>
      </Card>

      {/* Risk & Compliance */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Risk Assessment */}
        {profile?.riskScore !== null && profile?.riskScore !== undefined && (
          <KycRiskAssessment riskScore={profile.riskScore} />
        )}

        {/* PEP & Sanctions */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            PEP & Sanctions Screening
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">PEP Status</span>
              <Badge variant={profile?.pepStatus ? 'destructive' : 'secondary'}>
                {profile?.pepStatus ? 'Yes' : 'No'}
              </Badge>
            </div>
            {profile?.pepCategory && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">PEP Category</span>
                <span className="text-sm font-medium">{profile.pepCategory}</span>
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Sanctions Screening</span>
              <Badge variant={profile?.sanctionsScreeningDone ? 'default' : 'secondary'}>
                {profile?.sanctionsScreeningDone ? 'Completed' : 'Pending'}
              </Badge>
            </div>
            {profile?.sanctionsResult && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Screening Result</span>
                <Badge variant={profile.sanctionsResult === 'clean' ? 'default' : 'destructive'}>
                  {profile.sanctionsResult}
                </Badge>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Consents */}
      {(profile?.consentKyc || profile?.consentAml || profile?.consentTfr || profile?.consentPrivacy) && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Consents & Compliance
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {profile?.consentKyc !== undefined && (
              <div className="flex items-center gap-2">
                {profile.consentKyc ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">KYC Consent</span>
              </div>
            )}
            {profile?.consentAml !== undefined && (
              <div className="flex items-center gap-2">
                {profile.consentAml ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">AML Consent</span>
              </div>
            )}
            {profile?.consentTfr !== undefined && (
              <div className="flex items-center gap-2">
                {profile.consentTfr ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">TFR Consent</span>
              </div>
            )}
            {profile?.consentPrivacy !== undefined && (
              <div className="flex items-center gap-2">
                {profile.consentPrivacy ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">Privacy Policy</span>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

