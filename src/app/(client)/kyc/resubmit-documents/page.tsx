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
  FileText, Camera, Home, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { analyzeRejection, type ResubmitRequirement } from '@/lib/kyc/resubmit-helper';
import { Suspense, lazy } from 'react';

// Lazy load camera component
const CameraCapture = lazy(() => import('@/components/kyc/CameraCapture').then(m => ({ default: m.CameraCapture })));

interface UploadedDocument {
  documentType: string;
  file: File | null;
  fileUrl?: string;
}

interface ExistingDocument {
  documentType: string;
  fileUrl: string;
}

export default function ResubmitDocumentsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [kycSession, setKycSession] = useState<any>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Map<string, File>>(new Map());
  const [requirements, setRequirements] = useState<ResubmitRequirement[]>([]);
  const [existingDocs, setExistingDocs] = useState<Map<string, string>>(new Map()); // documentType -> fileUrl
  const [showCamera, setShowCamera] = useState<string | null>(null); // which document is being captured
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

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

        // Fetch existing documents first to provide context
        let uploadedDocTypes: string[] = [];
        try {
          const docsResponse = await fetch('/api/kyc/documents');
          if (docsResponse.ok) {
            const docsData = await docsResponse.json();
            uploadedDocTypes = docsData.documents?.map((doc: any) => doc.documentType) || [];
            console.log('📄 Existing document types for context:', uploadedDocTypes);
          }
        } catch (err) {
          console.error('Failed to fetch existing documents for context:', err);
        }

        const analysis = analyzeRejection(
          data.reviewRejectType,
          data.rejectLabels || [],
          uploadedDocTypes
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
        
        // 🆕 Fetch fresh problematic documents data from Sumsub API
        let hasProblematicSteps = data.problematicSteps && Array.isArray(data.problematicSteps) && data.problematicSteps.length > 0;
        
        // Try to fetch fresh data from API
        try {
          console.log('🔍 Fetching fresh problematic documents from Sumsub...');
          const problematicResponse = await fetch('/api/kyc/problematic-documents');
          
          if (problematicResponse.ok) {
            const problematicData = await problematicResponse.json();
            
            if (problematicData.success && problematicData.problematicDocuments.length > 0) {
              console.log('✅ Got fresh problematic documents:', problematicData.problematicDocuments);
              
              // Update kycSession with fresh data
              data.problematicSteps = problematicData.problematicDocuments;
              hasProblematicSteps = true;
              
              toast.success('Loaded detailed document issues from verification service');
            } else if (problematicData.fallback) {
              console.log('⚠️ Using fallback to general rejectLabels');
              toast.warning('Could not load specific document details. Showing all document types.');
            } else {
              console.warn('⚠️ API returned empty problematic documents array');
              toast.warning('Could not identify specific problematic documents. Please check all document types.');
            }
          } else {
            const errorData = await problematicResponse.json().catch(() => ({}));
            console.error('❌ API error:', problematicResponse.status, errorData);
            toast.error(`Failed to load document details: ${errorData.error || 'Unknown error'}`);
          }
        } catch (err) {
          console.error('⚠️ Failed to fetch fresh problematic documents:', err);
          toast.error('Could not connect to verification service. Please check all documents.');
          // Continue with existing data
        }
        
        if (hasProblematicSteps) {
          console.log('✅ Using detailed problematicSteps data:', data.problematicSteps);
          
          // Convert problematicSteps to requirements format
          const stepsRequirements: ResubmitRequirement[] = data.problematicSteps.map((step: any) => {
            // Determine action based on document type
            let action: 'UPLOAD_IDENTITY' | 'UPLOAD_ADDRESS' = 'UPLOAD_IDENTITY';
            let documentType: 'IDENTITY' | 'PROOF_OF_ADDRESS' = 'IDENTITY';
            
            if (step.stepName === 'PROOF_OF_RESIDENCE' || step.documentType === 'PROOF_OF_ADDRESS') {
              action = 'UPLOAD_ADDRESS';
              documentType = 'PROOF_OF_ADDRESS';
            }
            
            return {
              action,
              label: step.rejectLabels?.join(', ') || 'ISSUE_DETECTED',
              description: step.moderationComment || step.clientComment || 'Please upload a clear photo of the document',
              documentType,
              metadata: {
                imageId: step.imageId,
                stepName: step.stepName,
                country: step.country,
                buttonIds: step.buttonIds,
                specificDocumentType: step.documentType // DRIVERS, PASSPORT, ID_CARD, etc.
              }
            };
          });
          
          // Deduplicate by documentType but keep most detailed info
          const uniqueStepsReqs = stepsRequirements.reduce((acc, req) => {
            const existing = acc.find(r => r.documentType === req.documentType);
            if (!existing) {
              acc.push(req);
            } else {
              // Merge labels and descriptions
              if (req.label && !existing.label.includes(req.label)) {
                existing.label = `${existing.label}, ${req.label}`;
              }
              // Keep longer description
              if (req.description && req.description.length > existing.description.length) {
                existing.description = req.description;
              }
            }
            return acc;
          }, [] as ResubmitRequirement[]);
          
          setRequirements(uniqueStepsReqs);
          console.log('📋 Processed requirements from problematicSteps:', uniqueStepsReqs);
          
        } else {
          console.log('⚠️ No problematicSteps data, using IMPROVED fallback');
          console.warn('⚠️ Cannot determine specific problematic documents!');
          console.warn('⚠️ Showing ALL document types for user to check');
          
          // IMPROVED FALLBACK: Show ALL document types, not just guessed ones
          // This is safer because we don't know which specific document is problematic
          const allPossibleRequirements: ResubmitRequirement[] = [];
          
          // Always show IDENTITY documents
          allPossibleRequirements.push({
            action: 'UPLOAD_IDENTITY',
            label: data.rejectLabels?.join(', ') || 'DOCUMENT_ISSUE',
            description: data.moderationComment || 'Please upload clear photos of your identity document',
            documentType: 'IDENTITY',
            metadata: {
              warning: 'Specific problematic documents could not be determined. Please review all documents.'
            }
          });
          
          // Also show PROOF_OF_ADDRESS if it might be relevant
          if (uploadedDocTypes.some(t => t.includes('UTILITY_BILL') || t.includes('PROOF_OF_ADDRESS') || t.includes('BANK_STATEMENT'))) {
            allPossibleRequirements.push({
              action: 'UPLOAD_ADDRESS',
              label: data.rejectLabels?.join(', ') || 'DOCUMENT_ISSUE',
              description: data.moderationComment || 'Please upload a clear photo of your proof of address document',
              documentType: 'PROOF_OF_ADDRESS',
              metadata: {
                warning: 'Specific problematic documents could not be determined. Please review all documents.'
              }
            });
          }
          
          setRequirements(allPossibleRequirements);
          
          // Show clear warning to user
          toast.warning('⚠️ Could not determine specific problematic documents. Please review and re-upload all required documents.', {
            duration: 6000
          });
        }

        // Create map of existing documents
        try {
          const docsResponse = await fetch('/api/kyc/documents');
          if (docsResponse.ok) {
            const docsData = await docsResponse.json();
            const docsMap = new Map<string, string>();
            docsData.documents?.forEach((doc: ExistingDocument) => {
              docsMap.set(doc.documentType, doc.fileUrl);
            });
            setExistingDocs(docsMap);
            console.log('📄 Existing documents map:', Array.from(docsMap.keys()));
          }
        } catch (err) {
          console.error('Failed to fetch existing documents:', err);
        }
        
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
    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File size exceeds 10MB limit');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG, and PDF are allowed');
      return;
    }

    setUploadedDocs(prev => {
      const newMap = new Map(prev);
      newMap.set(docType, file);
      return newMap;
    });
    toast.success('File selected successfully');
  };

  const handleCameraCapture = (docType: string, file: File) => {
    setShowCamera(null);
    handleFileSelect(docType, file);
  };

  const handleRemoveFile = (docType: string) => {
    setUploadedDocs(prev => {
      const newMap = new Map(prev);
      newMap.delete(docType);
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

      // Upload each document individually
      let successCount = 0;
      const totalDocs = uploadedDocs.size;
      let currentDoc = 0;
      
      for (const [docType, file] of uploadedDocs.entries()) {
        currentDoc++;
        const isLastDocument = currentDoc === totalDocs;
        
        console.log(`📤 Uploading ${docType} (${currentDoc}/${totalDocs}):`, file.name);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', docType);
        formData.append('isLastDocument', isLastDocument ? 'true' : 'false');

        const uploadResponse = await fetch('/api/kyc/resubmit-documents', {
          method: 'POST',
          body: formData
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.error || `Failed to upload ${docType}`);
        }

        const result = await uploadResponse.json();
        console.log(`✅ ${docType} uploaded (${currentDoc}/${totalDocs}):`, result);
        successCount++;
      }
      
      console.log(`🎉 All ${successCount} documents uploaded successfully!`);

      // All uploads successful
      toast.success(`${successCount} document(s) uploaded successfully! Awaiting review...`);
      
      // Redirect back to KYC status page
      setTimeout(() => {
        router.push('/kyc');
      }, 1500);
      
    } catch (error: any) {
      console.error('❌ Upload error:', error);
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

      {/* Detailed Problematic Steps Info */}
      {kycSession.problematicSteps && Array.isArray(kycSession.problematicSteps) && kycSession.problematicSteps.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <strong className="text-orange-900 dark:text-orange-100">Specific Issues Detected:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              {kycSession.problematicSteps.map((step: any, idx: number) => (
                <li key={idx} className="text-orange-800 dark:text-orange-200">
                  • {step.documentType || step.stepName}: {step.rejectLabels?.join(', ')}
                  {step.moderationComment && (
                    <span className="block ml-4 text-xs text-orange-700 dark:text-orange-300 mt-0.5">
                      "{step.moderationComment.substring(0, 150)}{step.moderationComment.length > 150 ? '...' : ''}"
                    </span>
                  )}
                </li>
              ))}
            </ul>
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
          {requirements.flatMap((req, idx) => {
            // Determine document types based on what was originally uploaded
            const docTypes: Array<{ type: string; label: string }> = [];
            
            if (req.documentType === 'IDENTITY') {
              // Check what identity document was originally uploaded
              if (existingDocs.has('PASSPORT')) {
                docTypes.push({ type: 'PASSPORT', label: 'Passport' });
              } else if (existingDocs.has('ID_CARD') || existingDocs.has('ID_CARD_FRONT')) {
                // ID Card requires BOTH sides
                docTypes.push({ type: 'ID_CARD_FRONT', label: 'ID Card - Front Side' });
                docTypes.push({ type: 'ID_CARD_BACK', label: 'ID Card - Back Side' });
              } else {
                // Default to ID card if unknown
                docTypes.push({ type: 'ID_CARD_FRONT', label: 'ID Card - Front Side' });
                docTypes.push({ type: 'ID_CARD_BACK', label: 'ID Card - Back Side' });
              }
            } else if (req.documentType === 'PROOF_OF_ADDRESS') {
              docTypes.push({ type: 'UTILITY_BILL', label: 'Proof of Address' });
            } else {
              docTypes.push({ type: 'ID_CARD_FRONT', label: 'ID Card - Front Side' });
              docTypes.push({ type: 'ID_CARD_BACK', label: 'ID Card - Back Side' });
            }

            // Render upload UI for each document type
            return docTypes.map((doc, subIdx) => {
              const docType = doc.type;
              const docLabel = doc.label;
            
              return (
                <div key={`${docType}-${idx}-${subIdx}`} className="space-y-3">
                  <div className="flex items-start gap-3 pb-2 border-b">
                    <div className="rounded-md bg-primary/10 p-2 mt-0.5">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{docLabel}</h3>
                      {subIdx === 0 && (
                        <>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            Issue: {req.label.replace(/_/g, ' ').toLowerCase()}
                          </p>
                          {req.label && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {req.description}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {uploadedDocs.has(docType) && (
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-1" />
                    )}
                  </div>

                {/* File Upload UI (same as KycField FileUploadField) */}
                {uploadedDocs.has(docType) ? (
                  // File uploaded preview
                  <div className="flex items-center gap-3 p-4 border border-green-500/50 bg-green-500/10 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {uploadedDocs.get(docType)!.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadedDocs.get(docType)!.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(docType)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  // Upload UI
                  <div className="space-y-3">
                    {/* Camera Modal */}
                    {showCamera === docType && (
                      <Suspense fallback={<div className="text-center py-4">Loading camera...</div>}>
                        <CameraCapture
                          open={true}
                          onCapture={(file) => handleCameraCapture(docType, file)}
                          onCancel={() => setShowCamera(null)}
                          documentType={docLabel}
                        />
                      </Suspense>
                    )}

                    {/* Drag & Drop Area */}
                    <div className="group relative flex items-center justify-center border-2 border-dashed rounded-xl p-6 transition-all duration-200 border-border bg-card hover:border-primary hover:bg-primary/5 hover:shadow-sm cursor-pointer">
                      <label htmlFor={`file-${docType}`} className="flex flex-col items-center cursor-pointer w-full">
                        <Upload className="h-10 w-10 text-muted-foreground group-hover:text-primary mb-3 transition-colors" />
                        <p className="text-sm font-medium text-center mb-1">
                          Drop file here or <span className="text-primary">browse</span>
                        </p>
                        <p className="text-xs text-muted-foreground text-center">
                          JPEG, PNG, PDF (max 10MB)
                        </p>
                      </label>
                      <input
                        id={`file-${docType}`}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(docType, file);
                        }}
                        className="hidden"
                      />
                    </div>

                    {/* Camera Button */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCamera(docType)}
                      className="w-full"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Take Photo
                    </Button>
                  </div>
                )}
                </div>
              );
            });
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

