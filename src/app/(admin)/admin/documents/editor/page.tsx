"use client"

/**
 * Legal Document Editor Page
 * Create and edit legal documents with rich text editor
 */

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SerializedEditorState } from 'lexical'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LegalDocumentEditor } from '@/components/admin/LegalDocumentEditor'
import {
  Save, Eye, Globe, ArrowLeft, Loader2, FileText,
  CheckCircle, AlertCircle, Info
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const categories = [
  { value: 'PUBLIC', label: 'Public Policy', description: 'Terms, Privacy, etc.' },
  { value: 'INTERNAL', label: 'Internal Procedure', description: 'AML/CFT, KYC SOP' },
  { value: 'LEGAL', label: 'Legal Agreement', description: 'Client Agreement, DPA' },
]

export default function DocumentEditorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const documentId = searchParams?.get('id')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)

  // Form state
  const [key, setKey] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<'PUBLIC' | 'INTERNAL' | 'LEGAL'>('PUBLIC')
  const [isRequired, setIsRequired] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [slug, setSlug] = useState('')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [content, setContent] = useState<SerializedEditorState | null>(null)
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT')

  // Load document if editing
  useEffect(() => {
    if (documentId) {
      loadDocument(documentId)
    }
  }, [documentId])

  const loadDocument = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/documents/${id}`)
      const data = await response.json()

      if (data.success && data.document) {
        const doc = data.document
        setKey(doc.key)
        setTitle(doc.title)
        setDescription(doc.description || '')
        setCategory(doc.category)
        setIsRequired(doc.isRequired)
        setIsPublic(doc.isPublic)
        setSlug(doc.slug || '')
        setMetaTitle(doc.metaTitle || '')
        setMetaDescription(doc.metaDescription || '')
        setContent(doc.content)
        setStatus(doc.status)
      } else {
        toast.error('Failed to load document')
      }
    } catch (error) {
      console.error('Load document error:', error)
      toast.error('Failed to load document')
    } finally {
      setLoading(false)
    }
  }

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (!documentId && !slug) {
      setSlug(generateSlug(value))
    }
    if (!metaTitle) {
      setMetaTitle(value)
    }
  }

  const handleSave = async (isDraft = true) => {
    try {
      if (!title || !key || !content) {
        toast.error('Please fill in title, key, and content')
        return
      }

      setSaving(true)

      const payload = {
        key,
        title,
        description,
        category,
        isRequired,
        isPublic,
        slug: slug || null,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        content,
        status: isDraft ? 'DRAFT' : status,
      }

      const url = documentId
        ? `/api/admin/documents/${documentId}`
        : '/api/admin/documents'
      
      const method = documentId ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(documentId ? 'Document updated successfully' : 'Document created')
        if (!documentId && data.document) {
          router.push(`/admin/documents/editor?id=${data.document.id}`)
        } else if (documentId && !isDraft) {
          // Reload document data after updating published doc
          await loadDocument(documentId)
        }
      } else {
        toast.error(data.error || 'Failed to save document')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save document')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    try {
      if (!documentId) {
        toast.error('Please save the document first')
        return
      }

      if (!slug) {
        toast.error('Please provide a slug for the public URL')
        return
      }

      setPublishing(true)

      const response = await fetch(`/api/admin/documents/${documentId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          metaTitle,
          metaDescription,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Document published successfully!')
        setStatus('PUBLISHED')
        setShowPublishDialog(false)
        router.push('/admin/documents')
      } else {
        toast.error(data.error || 'Failed to publish document')
      }
    } catch (error) {
      console.error('Publish error:', error)
      toast.error('Failed to publish document')
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/documents')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h1 className="text-2xl font-bold">
              {documentId ? 'Edit Document' : 'Create Document'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {documentId ? `Editing: ${title}` : 'Create a new legal document'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === 'PUBLISHED' && (
            <Badge variant="default" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Published
            </Badge>
          )}
          {status === 'DRAFT' && (
            <Badge variant="secondary" className="gap-1">
              <FileText className="h-3 w-3" />
              Draft
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="metadata">Metadata & SEO</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Document key and categorization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="key">
                    Document Key *
                    <span className="text-xs text-muted-foreground ml-2">
                      (unique identifier)
                    </span>
                  </Label>
                  <Input
                    id="key"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="terms_of_service"
                    disabled={!!documentId}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div>
                            <div className="font-medium">{cat.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {cat.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Privacy Policy"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this document..."
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Required for Compliance</Label>
                  <p className="text-sm text-muted-foreground">
                    Mark as mandatory for regulatory compliance
                  </p>
                </div>
                <Switch checked={isRequired} onCheckedChange={setIsRequired} />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Public Access</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow public access without authentication
                  </p>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
            </CardContent>
          </Card>

          {/* Editor */}
          <Card>
            <CardHeader>
              <CardTitle>Document Content</CardTitle>
              <CardDescription>
                Write your legal document using the rich text editor below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LegalDocumentEditor
                initialContent={content || undefined}
                onChange={setContent}
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Don't forget to save your changes before leaving this page
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              {status === 'DRAFT' ? (
                <Button
                  variant="outline"
                  onClick={() => handleSave(true)}
                  disabled={saving}
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
              ) : (
                <Button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Update Published
                </Button>
              )}

              {documentId && status === 'DRAFT' && (
                <Button
                  onClick={() => setShowPublishDialog(true)}
                  disabled={!slug}
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Publish
                </Button>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Metadata Tab */}
        <TabsContent value="metadata" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Public URL & SEO</CardTitle>
              <CardDescription>
                Configure public access and search engine optimization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="slug">
                  URL Slug
                  {isPublic && <span className="text-destructive ml-1">*</span>}
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/legal/</span>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(generateSlug(e.target.value))}
                    placeholder="privacy-policy"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Public URL: {typeof window !== 'undefined' ? window.location.origin : ''}/legal/{slug || 'your-slug'}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="metaTitle">Meta Title (SEO)</Label>
                <Input
                  id="metaTitle"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder={title || 'Document title for search engines'}
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground">
                  {metaTitle.length}/60 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaDescription">Meta Description (SEO)</Label>
                <Textarea
                  id="metaDescription"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Brief description for search results..."
                  rows={3}
                  maxLength={160}
                />
                <p className="text-xs text-muted-foreground">
                  {metaDescription.length}/160 characters
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Document Preview</CardTitle>
                  <CardDescription>
                    See how your document will appear to users
                  </CardDescription>
                </div>
                {slug && status === 'PUBLISHED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/legal/${slug}`, '_blank')}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Live
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-8 bg-muted/30">
                <div className="max-w-3xl mx-auto space-y-6">
                  <div className="space-y-2">
                    <Badge variant="outline">
                      {categories.find(c => c.value === category)?.label}
                    </Badge>
                    <h1 className="text-4xl font-bold">{title || 'Document Title'}</h1>
                    {description && (
                      <p className="text-lg text-muted-foreground">{description}</p>
                    )}
                  </div>
                  <Separator />
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    {content ? (
                      <LegalDocumentEditor
                        initialContent={content}
                        readOnly
                      />
                    ) : (
                      <p className="text-muted-foreground italic">
                        No content yet. Write something in the Content tab.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Document</DialogTitle>
            <DialogDescription>
              Make this document publicly accessible at /legal/{slug}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Once published, this document will be visible to all users.
                Make sure all information is accurate and approved.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Public URL</Label>
              <Input
                value={`/legal/${slug}`}
                readOnly
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Status Change</Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Draft</Badge>
                <span>→</span>
                <Badge variant="default">Published</Badge>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPublishDialog(false)}
              disabled={publishing}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={publishing}
            >
              {publishing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Globe className="h-4 w-4 mr-2" />
              Publish Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

