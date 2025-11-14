/**
 * KycOverviewTab
 * 
 * Compact overview of KYC session with key information
 */

'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KycStatusBadge } from '@/components/features/KycStatusBadge';
import { formatDateTime } from '@/lib/formatters';
import { 
  User, 
  Mail, 
  Phone, 
  Globe, 
  Calendar,
  Shield,
  AlertTriangle,
  FileText,
  Briefcase,
  CheckCircle,
  XCircle,
  ExternalLink
} from 'lucide-react';
import type { KycSessionDetail } from './types';
import Link from 'next/link';

interface KycOverviewTabProps {
  session: KycSessionDetail;
  onUpdate: () => void;
}

export function KycOverviewTab({ session, onUpdate }: KycOverviewTabProps): JSX.Element {
  const profile = session.profile || session.user.profile;

  // Calculate completeness
  const totalFields = 10;
  const completedFields = [
    profile?.firstName,
    profile?.lastName,
    profile?.dateOfBirth,
    profile?.nationality,
    profile?.phoneNumber,
    profile?.addressStreet,
    profile?.idType,
    profile?.idNumber,
    profile?.sourceOfFunds,
    session.submittedAt,
  ].filter(Boolean).length;
  const completeness = Math.round((completedFields / totalFields) * 100);

  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Status */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Status</p>
          </div>
          <KycStatusBadge status={session.status} />
        </Card>

        {/* Completeness */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Completeness</p>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{completeness}%</span>
            <span className="text-xs text-muted-foreground">({completedFields}/{totalFields})</span>
          </div>
        </Card>

        {/* Risk Score */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Risk Score</p>
          </div>
          {profile?.riskScore !== null && profile?.riskScore !== undefined ? (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{profile.riskScore}</span>
              <Badge 
                variant={
                  profile.riskScore >= 70 ? 'destructive' : 
                  profile.riskScore >= 40 ? 'default' : 
                  'secondary'
                }
                className="text-xs"
              >
                {profile.riskScore >= 70 ? 'High' : profile.riskScore >= 40 ? 'Medium' : 'Low'}
              </Badge>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">N/A</span>
          )}
        </Card>

        {/* PEP Status */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">PEP Status</p>
          </div>
          <Badge variant={profile?.pepStatus ? 'destructive' : 'secondary'}>
            {profile?.pepStatus ? 'Yes' : 'No'}
          </Badge>
        </Card>
      </div>

      {/* Main Info Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* User Information */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <User className="h-4 w-4" />
              User Information
            </span>
            <Link href={`/admin/users/${session.userId}`}>
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{profile?.firstName} {profile?.lastName}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="font-mono text-xs">{session.user.email}</span>
            </div>
            {profile?.phoneNumber && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">
                  {profile.phoneCountry && `+${profile.phoneCountry} `}
                  {profile.phoneNumber}
                </span>
              </div>
            )}
            {profile?.dateOfBirth && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Date of Birth</span>
                <span className="font-medium">
                  {new Date(profile.dateOfBirth).toLocaleDateString('en-GB')}
                </span>
              </div>
            )}
            {profile?.nationality && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Nationality</span>
                <span className="font-medium">{profile.nationality}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Verification Timeline */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Verification Timeline
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <span className="font-medium">{formatDateTime(session.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Submitted</span>
              <span className="font-medium">
                {session.submittedAt ? formatDateTime(session.submittedAt) : (
                  <Badge variant="outline" className="text-xs">Not submitted</Badge>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Reviewed</span>
              <span className="font-medium">
                {session.reviewedAt ? formatDateTime(session.reviewedAt) : (
                  <Badge variant="outline" className="text-xs">Pending</Badge>
                )}
              </span>
            </div>
            {(session.kycProviderId || session.providerInfo) && (
              <div className="flex items-center justify-between text-sm pt-2 border-t">
                <span className="text-muted-foreground">KYC Provider</span>
                <Badge variant="outline" className="uppercase text-xs">
                  {session.providerInfo?.name || session.kycProviderId || 'N/A'}
                </Badge>
              </div>
            )}
            {session.verificationId && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Verification ID</span>
                <span className="font-mono text-xs">{session.verificationId.slice(0, 16)}...</span>
              </div>
            )}
            {/* Provider Dashboard Link */}
            {(() => {
              const providerId = session.kycProviderId || (session.metadata as any)?.provider;
              let dashboardUrl = null;
              
              if (providerId?.toLowerCase() === 'kycaid' && session.kycaidApplicantId) {
                dashboardUrl = `https://dashboard.kycaid.com/applicants/${session.kycaidApplicantId}`;
              } else if (providerId?.toLowerCase() === 'sumsub' && session.applicantId) {
                dashboardUrl = `https://cockpit.sumsub.com/checkus/applicant/${session.applicantId}/basicInfo`;
              }

              return dashboardUrl ? (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => window.open(dashboardUrl, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View in Provider Dashboard
                  </Button>
                </div>
              ) : null;
            })()}
          </div>
        </Card>
      </div>

      {/* Identity & Employment - Compact Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Identity Document */}
        {profile?.idType && (
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Identity Document
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Type</span>
                <Badge variant="outline" className="capitalize text-xs">
                  {profile.idType.replace(/_/g, ' ')}
                </Badge>
              </div>
              {profile.idNumber && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Number</span>
                  <span className="font-mono text-xs">{profile.idNumber}</span>
                </div>
              )}
              {profile.idIssuingCountry && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Issuing Country</span>
                  <span className="font-medium">{profile.idIssuingCountry}</span>
                </div>
              )}
              {profile.idExpiryDate && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Expiry</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs">
                      {new Date(profile.idExpiryDate).toLocaleDateString('en-GB')}
                    </span>
                    {new Date(profile.idExpiryDate) < new Date() && (
                      <Badge variant="destructive" className="text-xs">Expired</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Employment */}
        {(profile?.employmentStatus || profile?.occupation) && (
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Employment
            </h3>
            <div className="space-y-3">
              {profile.employmentStatus && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className="capitalize text-xs">
                    {profile.employmentStatus.replace(/_/g, ' ')}
                  </Badge>
                </div>
              )}
              {profile.occupation && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Occupation</span>
                  <span className="font-medium text-right max-w-[60%] truncate">
                    {profile.occupation}
                  </span>
                </div>
              )}
              {profile.employerName && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Employer</span>
                  <span className="font-medium text-right max-w-[60%] truncate">
                    {profile.employerName}
                  </span>
                </div>
              )}
              {profile.sourceOfFunds && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Funds Source</span>
                  <Badge variant="outline" className="capitalize text-xs">
                    {profile.sourceOfFunds.replace(/_/g, ' ')}
                  </Badge>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Rejection Reason (if rejected) */}
      {session.rejectionReason && (
        <Card className="p-4 border-destructive bg-destructive/5">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-destructive mb-1">Rejection Reason</p>
              <p className="text-sm text-muted-foreground">{session.rejectionReason}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Compliance Checks - Compact */}
      {(profile?.consentKyc || profile?.consentAml || profile?.consentTfr || profile?.consentPrivacy) && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Compliance Consents
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {profile?.consentKyc !== undefined && (
              <div className="flex items-center gap-2">
                {profile.consentKyc ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-xs">KYC</span>
              </div>
            )}
            {profile?.consentAml !== undefined && (
              <div className="flex items-center gap-2">
                {profile.consentAml ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-xs">AML</span>
              </div>
            )}
            {profile?.consentTfr !== undefined && (
              <div className="flex items-center gap-2">
                {profile.consentTfr ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-xs">TFR</span>
              </div>
            )}
            {profile?.consentPrivacy !== undefined && (
              <div className="flex items-center gap-2">
                {profile.consentPrivacy ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-xs">Privacy</span>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
