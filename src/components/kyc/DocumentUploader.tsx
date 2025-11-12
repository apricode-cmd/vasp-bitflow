'use client';

/**
 * Document Uploader Component
 * 
 * Enterprise-grade document upload for KYC verification
 * Supports: Passport, ID Card (front/back), Proof of Address, Selfie
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Image as ImageIcon,
  CreditCard,
  Home
} from 'lucide-react';
import { toast } from 'sonner';

export interface DocumentType {
  id: string;
  type: 'PASSPORT' | 'ID_CARD' | 'UTILITY_BILL' | 'SELFIE';
  subType?: 'FRONT_SIDE' | 'BACK_SIDE';
  label: string;
  description: string;
  required: boolean;
  icon: any;
}

export interface UploadedDocument {
  id: string;
  providerDocumentId?: string;
  fileName: string;
  status: 'uploading' | 'success' | 'error';
  warnings?: string[];
  error?: string;
}

interface DocumentUploaderProps {
  country: string; // ISO-3 code (e.g., "POL", "USA")
  documentTypes?: DocumentType[];
  onAllUploaded?: (documents: UploadedDocument[]) => void;
  onUploadComplete?: (doc: UploadedDocument) => void;
}

// Default document types
const DEFAULT_DOCUMENT_TYPES: DocumentType[] = [
  {
    id: 'passport',
    type: 'PASSPORT',
    label: 'Passport',
    description: 'Full passport scan (photo page)',
    required: false,
    icon: CreditCard
  },
  {
    id: 'id_front',
    type: 'ID_CARD',
    subType: 'FRONT_SIDE',
    label: 'ID Card - Front',
    description: 'Front side of your ID card',
    required: true,
    icon: CreditCard
  },
  {
    id: 'id_back',
    type: 'ID_CARD',
    subType: 'BACK_SIDE',
    label: 'ID Card - Back',
    description: 'Back side of your ID card',
    required: true,
    icon: CreditCard
  },
  {
    id: 'proof_of_address',
    type: 'UTILITY_BILL',
    label: 'Proof of Address',
    description: 'Utility bill, bank statement (max 3 months old)',
    required: true,
    icon: Home
  }
];

export function DocumentUploader({
  country,
  documentTypes = DEFAULT_DOCUMENT_TYPES,
  onAllUploaded,
  onUploadComplete
}: DocumentUploaderProps) {
  const [uploadedDocs, setUploadedDocs] = useState<Map<string, UploadedDocument>>(new Map());
  const [dragOver, setDragOver] = useState<string | null>(null);

  const handleFileSelect = async (docType: DocumentType, file: File) => {
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

    // Set uploading state
    const tempDoc: UploadedDocument = {
      id: docType.id,
      fileName: file.name,
      status: 'uploading'
    };
    
    setUploadedDocs(prev => new Map(prev).set(docType.id, tempDoc));

    try {
      // Prepare FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', docType.type);
      formData.append('country', country);
      
      if (docType.subType) {
        formData.append('documentSubType', docType.subType);
      }

      console.log('📤 Uploading document:', {
        type: docType.type,
        subType: docType.subType,
        fileName: file.name,
        country
      });

      // Upload to API
      const response = await fetch('/api/kyc/upload-document', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      console.log('✅ Upload successful:', result);

      // Update state with success
      const successDoc: UploadedDocument = {
        id: docType.id,
        providerDocumentId: result.data.providerDocumentId,
        fileName: file.name,
        status: 'success',
        warnings: result.data.warnings || []
      };

      setUploadedDocs(prev => new Map(prev).set(docType.id, successDoc));

      toast.success(`${docType.label} uploaded successfully!`);

      // Callback
      if (onUploadComplete) {
        onUploadComplete(successDoc);
      }

      // Check if all required docs are uploaded
      checkAllUploaded();

    } catch (error: any) {
      console.error('❌ Upload error:', error);

      // Update state with error
      const errorDoc: UploadedDocument = {
        id: docType.id,
        fileName: file.name,
        status: 'error',
        error: error.message || 'Upload failed'
      };

      setUploadedDocs(prev => new Map(prev).set(docType.id, errorDoc));

      toast.error(`Failed to upload ${docType.label}: ${error.message}`);
    }
  };

  const checkAllUploaded = () => {
    const requiredTypes = documentTypes.filter(d => d.required);
    const allRequired = requiredTypes.every(type => {
      const doc = uploadedDocs.get(type.id);
      return doc && doc.status === 'success';
    });

    if (allRequired && onAllUploaded) {
      const docsArray = Array.from(uploadedDocs.values());
      onAllUploaded(docsArray);
    }
  };

  const handleDrop = (e: React.DragEvent, docType: DocumentType) => {
    e.preventDefault();
    setDragOver(null);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(docType, file);
    }
  };

  const renderDocumentCard = (docType: DocumentType) => {
    const uploadedDoc = uploadedDocs.get(docType.id);
    const Icon = docType.icon;

    return (
      <Card
        key={docType.id}
        className={`relative transition-all ${
          dragOver === docType.id
            ? 'border-primary border-2 bg-primary/5'
            : uploadedDoc?.status === 'success'
            ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
            : uploadedDoc?.status === 'error'
            ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
            : ''
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(docType.id);
        }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => handleDrop(e, docType)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">{docType.label}</CardTitle>
            </div>
            {docType.required && (
              <Badge variant="destructive" className="text-xs">
                Required
              </Badge>
            )}
            {uploadedDoc?.status === 'success' && (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
            {uploadedDoc?.status === 'error' && (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            {uploadedDoc?.status === 'uploading' && (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            )}
          </div>
          <CardDescription className="text-xs">{docType.description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Upload area */}
          {!uploadedDoc || uploadedDoc.status === 'error' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center border-2 border-dashed rounded-lg p-6 hover:border-primary hover:bg-accent/50 transition-colors cursor-pointer">
                <label htmlFor={`file-${docType.id}`} className="cursor-pointer text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drop file here or <span className="text-primary underline">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPEG, PNG, PDF (max 10MB)
                  </p>
                </label>
                <Input
                  id={`file-${docType.id}`}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileSelect(docType, file);
                    }
                  }}
                />
              </div>
            </div>
          ) : uploadedDoc.status === 'success' ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-950/30 rounded-lg">
                <FileText className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-900 dark:text-green-100 flex-1 truncate">
                  {uploadedDoc.fileName}
                </span>
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              </div>

              {/* Warnings */}
              {uploadedDoc.warnings && uploadedDoc.warnings.length > 0 && (
                <Alert variant="default" className="bg-orange-50 border-orange-200">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-xs text-orange-900">
                    {uploadedDoc.warnings.join(', ')}
                  </AlertDescription>
                </Alert>
              )}

              {/* Re-upload button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setUploadedDocs(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(docType.id);
                    return newMap;
                  });
                }}
              >
                <Upload className="h-3 w-3 mr-1" />
                Re-upload
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {/* Error message */}
          {uploadedDoc?.status === 'error' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {uploadedDoc.error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {documentTypes.map(renderDocumentCard)}
      </div>

      {/* Upload summary */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">
            {Array.from(uploadedDocs.values()).filter(d => d.status === 'success').length} /{' '}
            {documentTypes.filter(d => d.required).length} required documents uploaded
          </span>
        </div>
        {Array.from(uploadedDocs.values()).filter(d => d.status === 'success').length === documentTypes.filter(d => d.required).length && (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            All Required Uploaded
          </Badge>
        )}
      </div>
    </div>
  );
}

