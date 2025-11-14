/**
 * KycDocumentsTab
 * 
 * Displays and manages KYC documents
 * Supports multiple providers (KYCAID, Sumsub)
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Eye, 
  RefreshCw,
  ImageIcon,
  Download
} from 'lucide-react';
import type { KycSessionDetail } from './types';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface KycDocumentsTabProps {
  session: KycSessionDetail;
  onUpdate: () => void;
}

export function KycDocumentsTab({ session, onUpdate }: KycDocumentsTabProps): JSX.Element {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);

  const hasDocuments = session.documents && session.documents.length > 0;
  const canSync = session.kycaidApplicantId && 
    (session.status === 'APPROVED' || session.status === 'REJECTED');

  const handleSyncDocuments = async (): Promise<void> => {
    try {
      setSyncing(true);
      toast.loading('Syncing documents from provider...', { id: 'sync-docs' });

      const response = await fetch(`/api/admin/kyc/${session.id}/download-report`, {
        method: 'POST'
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to sync documents', { id: 'sync-docs' });
        return;
      }

      const result = await response.json();
      toast.success(result.message || `Synced ${result.documentsCount} documents`, { id: 'sync-docs' });

      // Refresh data
      onUpdate();
      router.refresh();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync documents', { id: 'sync-docs' });
    } finally {
      setSyncing(false);
    }
  };

  const viewDocument = (doc: any): void => {
    const docData = doc.verificationData as any;
    const imageUrls = [
      docData?.front_side,
      docData?.back_side,
      docData?.other_side_1,
      docData?.other_side_2,
      docData?.other_side_3,
      docData?.portrait
    ].filter(Boolean);

    if (imageUrls.length === 0) {
      toast.error('No images available for this document');
      return;
    }

    // Open in new tab
    const newTab = window.open('', '_blank');
    if (newTab) {
      newTab.document.write(`
        <html>
          <head>
            <title>Document Images - ${docData?.type || 'Document'}</title>
            <style>
              body {
                background: #000;
                margin: 0;
                padding: 20px;
                text-align: center;
                font-family: system-ui, -apple-system, sans-serif;
              }
              h1 {
                color: #fff;
                margin-bottom: 20px;
                font-size: 24px;
              }
              .info {
                color: #999;
                margin-bottom: 30px;
                font-size: 14px;
              }
              img {
                max-width: 90%;
                margin: 20px auto;
                display: block;
                box-shadow: 0 4px 20px rgba(255,255,255,0.1);
                border-radius: 8px;
              }
              .badge {
                display: inline-block;
                padding: 4px 12px;
                background: #333;
                color: #fff;
                border-radius: 4px;
                font-size: 12px;
                margin: 0 5px;
              }
            </style>
          </head>
          <body>
            <h1>${docData?.type?.replace('_', ' ') || 'Document'}</h1>
            <div class="info">
              ${docData?.document_number ? `<span class="badge">Number: ${docData.document_number}</span>` : ''}
              ${docData?.issue_date ? `<span class="badge">Issued: ${docData.issue_date}</span>` : ''}
              ${docData?.expiry_date ? `<span class="badge">Expires: ${docData.expiry_date}</span>` : ''}
            </div>
            ${imageUrls.map((url, idx) => `
              <div style="margin: 40px 0;">
                <p style="color: #666; font-size: 12px; margin-bottom: 10px;">Image ${idx + 1} of ${imageUrls.length}</p>
                <img src="${url}" alt="Document image ${idx + 1}" />
              </div>
            `).join('')}
          </body>
        </html>
      `);
      newTab.document.close();
    }
  };

  if (!hasDocuments && !canSync) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            No documents available yet
          </p>
        </div>
      </Card>
    );
  }

  if (!hasDocuments && canSync) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground mb-4">
            No documents synced yet. Click below to fetch from provider.
          </p>
          <Button 
            onClick={handleSyncDocuments}
            disabled={syncing}
          >
            {syncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Documents
              </>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with sync button */}
      {canSync && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {session.documents?.length || 0}
              </Badge>
              <span className="text-sm">
                documents synced from provider
              </span>
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={handleSyncDocuments}
              disabled={syncing}
            >
              {syncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Re-sync
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Documents Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {session.documents?.map((doc) => {
          const docData = doc.verificationData as any;
          const imageUrls = [
            docData?.front_side,
            docData?.back_side,
            docData?.other_side_1,
            docData?.other_side_2,
            docData?.other_side_3,
            docData?.portrait
          ].filter(Boolean);

          const firstImage = imageUrls[0];

          return (
            <Card key={doc.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* Document Image Preview */}
              <AspectRatio ratio={16 / 9}>
                {firstImage ? (
                  <img
                    src={firstImage}
                    alt={docData?.type || 'Document'}
                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => viewDocument(doc)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </AspectRatio>

              {/* Document Info */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant={docData?.status === 'valid' ? 'default' : 'secondary'}>
                    {docData?.type?.replace('_', ' ') || 'Unknown'}
                  </Badge>
                  {docData?.status && (
                    <Badge 
                      variant={docData.status === 'valid' ? 'default' : 'destructive'} 
                      className="text-xs"
                    >
                      {docData.status}
                    </Badge>
                  )}
                </div>

                {/* Document Details */}
                <div className="space-y-1.5 text-xs">
                  {docData?.document_number && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Number:</span>
                      <span className="font-mono font-medium">{docData.document_number}</span>
                    </div>
                  )}
                  {docData?.issue_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Issued:</span>
                      <span className="font-medium">{docData.issue_date}</span>
                    </div>
                  )}
                  {docData?.expiry_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expires:</span>
                      <span className="font-medium">{docData.expiry_date}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{imageUrls.length} image{imageUrls.length !== 1 ? 's' : ''}</span>
                  {docData?.front_side_size && (
                    <span>{Math.round(docData.front_side_size / 1024)} KB</span>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => viewDocument(doc)}
                  disabled={imageUrls.length === 0}
                >
                  <Eye className="h-3 w-3 mr-2" />
                  View {imageUrls.length} image{imageUrls.length > 1 ? 's' : ''}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

