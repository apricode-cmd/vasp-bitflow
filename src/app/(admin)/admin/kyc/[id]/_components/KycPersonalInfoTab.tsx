/**
 * KycPersonalInfoTab
 * 
 * Displays complete personal information including:
 * - Basic info (name, DOB, nationality)
 * - Identity document details
 * - Employment information
 * - Source of funds
 */

'use client';

import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  FileText, 
  Briefcase,
  DollarSign
} from 'lucide-react';
import type { KycSessionDetail } from './types';
import { format } from 'date-fns';

interface KycPersonalInfoTabProps {
  session: KycSessionDetail;
}

export function KycPersonalInfoTab({ session }: KycPersonalInfoTabProps): JSX.Element {
  const profile = session.profile || session.user.profile;

  if (!profile) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground text-center">No personal information available</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Basic Personal Information */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <User className="h-4 w-4" />
          Personal Information
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">First Name</p>
              <p className="font-medium">{profile.firstName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Last Name</p>
              <p className="font-medium">{profile.lastName || 'N/A'}</p>
            </div>
            {profile.dateOfBirth && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Date of Birth</p>
                <p className="font-medium">
                  {format(new Date(profile.dateOfBirth), 'dd.MM.yyyy')}
                </p>
              </div>
            )}
          </div>
          <div className="space-y-4">
            {profile.placeOfBirth && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Place of Birth</p>
                <p className="font-medium">{profile.placeOfBirth}</p>
              </div>
            )}
            {profile.nationality && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Nationality</p>
                <p className="font-medium">{profile.nationality}</p>
              </div>
            )}
            {profile.country && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Country of Residence</p>
                <p className="font-medium">{profile.country}</p>
              </div>
            )}
          </div>
        </div>

        {/* Contact Information */}
        {(profile.phoneNumber || profile.phone) && (
          <>
            <Separator className="my-6" />
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Phone Number</p>
                <p className="font-medium">
                  {profile.phoneCountry && `+${profile.phoneCountry} `}
                  {profile.phoneNumber || profile.phone}
                </p>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Identity Document */}
      {profile.idType && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Identity Document
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Document Type</p>
                <Badge variant="outline" className="capitalize">
                  {profile.idType.replace(/_/g, ' ')}
                </Badge>
              </div>
              {profile.idNumber && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Document Number</p>
                  <p className="font-medium font-mono">{profile.idNumber}</p>
                </div>
              )}
              {profile.idIssuingCountry && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Issuing Country</p>
                  <p className="font-medium">{profile.idIssuingCountry}</p>
                </div>
              )}
            </div>
            <div className="space-y-4">
              {profile.idIssueDate && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Issue Date</p>
                  <p className="font-medium">
                    {format(new Date(profile.idIssueDate), 'dd.MM.yyyy')}
                  </p>
                </div>
              )}
              {profile.idExpiryDate && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Expiry Date</p>
                  <p className="font-medium">
                    {format(new Date(profile.idExpiryDate), 'dd.MM.yyyy')}
                  </p>
                  {new Date(profile.idExpiryDate) < new Date() && (
                    <Badge variant="destructive" className="mt-1">Expired</Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Employment Information */}
      {(profile.employmentStatus || profile.occupation || profile.employerName) && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Employment Information
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {profile.employmentStatus && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Employment Status</p>
                <Badge variant="outline" className="capitalize">
                  {profile.employmentStatus.replace(/_/g, ' ')}
                </Badge>
              </div>
            )}
            {profile.occupation && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Occupation</p>
                <p className="font-medium">{profile.occupation}</p>
              </div>
            )}
            {profile.employerName && (
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground mb-1">Employer Name</p>
                <p className="font-medium">{profile.employerName}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Source of Funds & Purpose */}
      {(profile.sourceOfFunds || profile.sourceOfWealth || profile.purposeOfAccount) && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Source of Funds & Purpose
          </h3>
          <div className="space-y-4">
            {profile.sourceOfFunds && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Source of Funds</p>
                <Badge variant="outline" className="capitalize">
                  {profile.sourceOfFunds.replace(/_/g, ' ')}
                </Badge>
              </div>
            )}
            {profile.sourceOfWealth && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Source of Wealth (EDD)</p>
                <p className="text-sm bg-muted p-3 rounded-md">{profile.sourceOfWealth}</p>
              </div>
            )}
            {profile.purposeOfAccount && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Purpose of Account</p>
                <p className="text-sm bg-muted p-3 rounded-md">{profile.purposeOfAccount}</p>
              </div>
            )}
          </div>
        </Card>
      )}

    </div>
  );
}

