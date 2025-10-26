/**
 * KYC Form Page
 * Dynamic form based on configured fields
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DynamicKycForm } from '@/components/forms/DynamicKycForm';
import { ArrowLeft, Shield } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function KycFormPage(): React.ReactElement {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (formData: Record<string, any>) => {
    setSubmitting(true);
    
    try {
      const response = await fetch('/api/kyc/submit-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('KYC form submitted successfully');
        router.push('/kyc');
      } else {
        toast.error(data.error || 'Failed to submit form');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-medium">Identity Verification</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Complete KYC Verification</h1>
          <p className="text-muted-foreground mt-1">
            Fill out the form below to verify your identity
          </p>
        </div>
        <Link href="/kyc">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      {/* Form */}
      <DynamicKycForm onSubmit={handleSubmit} />
    </div>
  );
}


