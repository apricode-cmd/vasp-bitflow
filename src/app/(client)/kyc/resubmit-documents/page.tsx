/**
 * KYC Document Resubmission Page
 * 
 * Allows users to upload corrected documents for RETRY rejections
 * Based on rejectLabels from Sumsub webhook
 */
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Upload, AlertCircle, CheckCircle2, Loader2, ArrowLeft, 
  FileText, Camera, Home
} from 'lucide-react';
import { toast } from 'sonner';
import { DocumentUploader } from '@/components/kyc/DocumentUploader';
import { analyzeRejection, type ResubmitRequirement } from '@/lib/kyc/resubmit-helper';

interface UploadedDocument {
  documentType: string;
  file: File | null;
  fileUrl?: string;
}

export default function ResubmitDocumentsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [kycSession, setKycSession] = useState<any>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Map<string, File>>(new Map());
  const [requirements, setRequirements] = useState<ResubmitRequirement[]>([]);

  // Fetch KYC session and analyze rejection
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    
    if (!session?.user?.id) {
      router.push('/login');
      return;
    }

    const fetchKycSession = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/kyc/session');
        
        if (!response.ok) {
          throw new Error('Failed to fetch KYC session');
        }

        const data = await response.json();
        
        // Check if user can resubmit
        if (data.status !== 'REJECTED') {
          toast.error('You can only resubmit documents for rejected KYC');
          router.push('/kyc');
          return;
        }

        const analysis = analyzeRejection(
          data.reviewRejectType,
          data.rejectLabels || []
        );

        if (!analysis.canResubmit || analysis.isFinal) {
          toast.error('Resubmission not available for this rejection');
          router.push('/kyc');
          return;
        }

        if (!analysis.needsDocumentUpload) {
          toast.info('No documents need to be uploaded. Try other options.');
          router.push('/kyc');
          return;
        }

        setKycSession(data);
        setRequirements(analysis.requirements.filter(
          r => r.action === 'UPLOAD_IDENTITY' || r.action === 'UPLOAD_ADDRESS'
        ));
        
      } catch (error: any) {
        console.error('Error fetching KYC session:', error);
        toast.error('Failed to load resubmission data');
        router.push('/kyc');
      } finally {
        setLoading(false);
      }
    };

    fetchKycSession();
  }, [session, sessionStatus, router]);

  const handleFileSelect = (docType: string, file: File) => {
    setUploadedDocs(prev => {
      const newMap = new Map(prev);
      newMap.set(docType, file);
      return newMap;
    });
  };

  const handleSubmit = async () => {
    if (uploadedDocs.size === 0) {
      toast.error('Please upload at least one document');
      return;
    }

    try {
      setSubmitting(true);

      // Upload each document
      for (const [docType, file] of uploadedDocs.entries()) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', docType);

        const uploadResponse = await fetch('/api/kyc/resubmit-documents', {
          method: 'POST',
          body: formData
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.error || 'Failed to upload document');
        }
      }

      // All uploads successful
      toast.success('Documents uploaded successfully! Awaiting review...');
      
      // Redirect back to KYC status page
      setTimeout(() => {
        router.push('/kyc');
      }, 1500);
      
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload documents');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading || sessionStatus === 'loading') {
    return (
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        <Skeleton className="h-12 w-3/4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!kycSession) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/kyc')}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to KYC Status
        </Button>
        
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Upload className="h-8 w-8 text-primary" />
          Upload Corrected Documents
        </h1>
        <p className="text-muted-foreground">
          Upload clear photos of the documents that were rejected
        </p>
      </div>

      {/* Moderation Comment */}
      {kycSession.moderationComment && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Moderator:</strong> {kycSession.moderationComment}
          </AlertDescription>
        </Alert>
      )}

      {/* Required Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Documents to Upload</CardTitle>
          <CardDescription>
            Upload clear, high-quality photos of the following documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {requirements.map((req, idx) => {
            const docType = req.documentType === 'IDENTITY' ? 'ID_CARD' : 
                           req.documentType === 'PROOF_OF_ADDRESS' ? 'UTILITY_BILL' : 
                           'ID_CARD';
            
            return (
              <div key={idx} className="space-y-3">
                <div className="flex items-start gap-3 pb-2 border-b">
                  <div className="rounded-md bg-primary/10 p-2 mt-0.5">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{req.description}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Issue: {req.label.replace(/_/g, ' ').toLowerCase()}
                    </p>
                  </div>
                  {uploadedDocs.has(docType) && (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-1" />
                  )}
                </div>

                <DocumentUploader
                  type={docType as any}
                  label={req.description}
                  required={true}
                  onFileSelect={(file) => handleFileSelect(docType, file)}
                  existingUrl={undefined}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Tips */}
      <Alert>
        <Camera className="h-4 w-4" />
        <AlertDescription>
          <strong>Tips for good photos:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Ensure good lighting - avoid shadows and glare</li>
            <li>• All text should be clearly readable</li>
            <li>• Include all 4 corners of the document</li>
            <li>• For ID cards, upload both front and back sides</li>
            <li>• Use original documents, not photocopies</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={submitting || uploadedDocs.size === 0}
          className="flex-1"
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-5 w-5 mr-2" />
              Submit Documents ({uploadedDocs.size})
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard')}
          size="lg"
        >
          <Home className="h-5 w-5 mr-2" />
          Home
        </Button>
      </div>
    </div>
  );
}

