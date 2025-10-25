/**
 * Legal Document Editor Component
 * 
 * Editor for legal documents (Terms, Privacy Policy, etc.)
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Save, Eye, Code, FileText, Loader2, Info } from 'lucide-react';

interface LegalDocumentEditorProps {
  documentType: 'terms' | 'privacy' | 'aml' | 'cookies';
  title: string;
  description: string;
  apiEndpoint: string;
}

export function LegalDocumentEditor({
  documentType,
  title,
  description,
  apiEndpoint
}: LegalDocumentEditorProps): React.ReactElement {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch document on mount or when documentType changes
  useEffect(() => {
    fetchDocument();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentType]);

  const fetchDocument = async () => {
    try {
      const response = await fetch(`${apiEndpoint}/${documentType}`);
      const data = await response.json();
      
      if (data.success && data.content) {
        setContent(data.content);
        setLastUpdated(data.updatedAt ? new Date(data.updatedAt) : null);
      }
    } catch (error) {
      console.error('Failed to fetch document:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${apiEndpoint}/${documentType}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Document saved successfully');
        setLastUpdated(new Date());
      } else {
        toast.error(data.error || 'Failed to save document');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <Badge variant="outline" className="text-xs">
                Updated: {lastUpdated.toLocaleDateString()}
              </Badge>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setViewMode(viewMode === 'edit' ? 'preview' : 'edit')}
            >
              {viewMode === 'edit' ? (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </>
              ) : (
                <>
                  <Code className="h-4 w-4 mr-2" />
                  Edit
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Write your legal document content below. Use markdown formatting for better structure. 
            This will be displayed to users on the frontend.
          </AlertDescription>
        </Alert>

        <Separator />

        {viewMode === 'edit' ? (
          <div className="space-y-4">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Enter your ${title.toLowerCase()} content here...

You can use plain text or markdown:

# Heading
## Subheading
- Bullet point
**Bold text**
*Italic text*

Update effective: [Date]`}
              rows={20}
              className="font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {content.length} characters
              </span>
              <Button onClick={handleSave} disabled={saving || !content}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Document
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none p-6 bg-muted/30 rounded-lg min-h-[400px]">
            {content ? (
              <pre className="whitespace-pre-wrap font-sans text-sm">{content}</pre>
            ) : (
              <p className="text-muted-foreground">No content available</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

