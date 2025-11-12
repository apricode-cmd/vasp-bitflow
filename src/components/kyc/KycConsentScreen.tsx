/**
 * KycConsentScreen - Consent form before KYC verification
 * Shows required consents: biometrics, terms, attestation
 */
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, FileText, ArrowLeft, ArrowRight, 
  AlertCircle, Scale, FolderArchive, RefreshCw 
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onAccept: () => void;
  onCancel?: () => void;
}

export function KycConsentScreen({ onAccept, onCancel }: Props) {
  const [consents, setConsents] = useState({
    biometrics: false,
    termsAndPrivacy: false,
    attestation: false,
  });

  const handleSubmit = () => {
    if (!consents.biometrics) {
      toast.error('Please give explicit consent to process your biometric data');
      return;
    }
    if (!consents.termsAndPrivacy) {
      toast.error('Please accept the Terms of Service and Privacy Policy');
      return;
    }
    if (!consents.attestation) {
      toast.error('Please confirm that the information is accurate');
      return;
    }
    
    toast.success('Consents accepted. You can now proceed with KYC verification.');
    onAccept();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in p-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold">KYC Verification</h1>
        <p className="text-muted-foreground text-lg">
          Before we begin, please review and accept the following consents and legal information
        </p>
      </div>

      {/* Consents Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Required Consents
          </CardTitle>
          <CardDescription>
            All consents are required to proceed with KYC verification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Biometrics Consent */}
          <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
            <Checkbox
              id="biometrics"
              checked={consents.biometrics}
              onCheckedChange={(checked) => 
                setConsents(prev => ({ ...prev, biometrics: checked as boolean }))
              }
              className="mt-1"
            />
            <div className="flex-1">
              <Label htmlFor="biometrics" className="cursor-pointer font-semibold text-base">
                Biometric Data Processing Consent
                <span className="text-destructive ml-1">*</span>
              </Label>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                I give explicit consent to process my biometric data (selfie/liveness) solely for AML/KYC identity verification.
              </p>
              <Badge variant="outline" className="mt-2">
                Art. 9(2)(a) GDPR
              </Badge>
            </div>
          </div>

          {/* Terms and Privacy */}
          <div className="flex items-start space-x-3 p-4 rounded-lg border bg-muted/30">
            <Checkbox
              id="terms"
              checked={consents.termsAndPrivacy}
              onCheckedChange={(checked) => 
                setConsents(prev => ({ ...prev, termsAndPrivacy: checked as boolean }))
              }
              className="mt-1"
            />
            <div className="flex-1">
              <Label htmlFor="terms" className="cursor-pointer font-semibold text-base">
                Terms and Privacy Policy
                <span className="text-destructive ml-1">*</span>
              </Label>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                I accept the{' '}
                <a href="/terms" target="_blank" className="text-primary hover:underline font-medium">
                  Terms of Service
                </a>
                {' '}and have read the{' '}
                <a href="/privacy" target="_blank" className="text-primary hover:underline font-medium">
                  Privacy Policy
                </a>.
              </p>
            </div>
          </div>

          {/* Attestation */}
          <div className="flex items-start space-x-3 p-4 rounded-lg border bg-muted/30">
            <Checkbox
              id="attestation"
              checked={consents.attestation}
              onCheckedChange={(checked) => 
                setConsents(prev => ({ ...prev, attestation: checked as boolean }))
              }
              className="mt-1"
            />
            <div className="flex-1">
              <Label htmlFor="attestation" className="cursor-pointer font-semibold text-base">
                Information Accuracy Attestation
                <span className="text-destructive ml-1">*</span>
              </Label>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                I confirm the information is accurate and I'm not a resident/citizen of restricted or sanctioned jurisdictions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal Information */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <AlertCircle className="h-5 w-5" />
            Legal Information
          </CardTitle>
          <CardDescription className="text-blue-700 dark:text-blue-300">
            Important information about data processing and retention
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-blue-800 dark:text-blue-200">
          <div className="flex gap-3">
            <Scale className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <strong>AML Legal Basis:</strong> We process KYC data to comply with AML/CFT laws (Art. 6(1)(c) GDPR).
            </div>
          </div>
          <div className="flex gap-3">
            <FolderArchive className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <strong>Record Retention:</strong> KYC and transaction records are retained at least 5 years per AMLD.
            </div>
          </div>
          <div className="flex gap-3">
            <RefreshCw className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <strong>Travel Rule (EU 2023/1113):</strong> For crypto transfers, sender/beneficiary data accompany the transfer; self-hosted addresses may require ownership checks over €1,000.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onCancel || (() => window.history.back())}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={handleSubmit}
          size="lg"
        >
          Accept & Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

