"use client"

/**
 * Legal Library - Document Management
 * Manage legal documents, policies, and agreements
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { BrandLoaderInline } from '@/components/ui/brand-loader'
import { toast } from 'sonner'
import { 
  FileText, Globe, Shield, Edit, Trash2, Plus,
  Loader2, AlertCircle, CheckCircle, Search, ExternalLink,
  Lock, Scale
} from 'lucide-react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { format } from 'date-fns'

interface Document {
  id: string
  key: string
  title: string
  description: string | null
  category: 'PUBLIC' | 'INTERNAL' | 'LEGAL'
  slug: string | null
  isRequired: boolean
  status: 'DRAFT' | 'PUBLISHED' | 'REVIEW' | 'ARCHIVED'
  isPublic: boolean
  publishedAt: Date | null
  updatedAt: Date
  createdAt: Date
}

export default function DocumentsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('public')
  const [documents, setDocuments] = useState<Document[]>([])
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; document: Document | null }>({
    open: false,
    document: null,
  })
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/documents')
      const data = await response.json()
      if (data.success) {
        setDocuments(data.documents)
      } else {
        toast.error('Failed to load documents')
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error)
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const filterDocuments = (docs: Document[], category: string) => {
    let filtered = docs
    
    // Filter by category
    if (category === 'public') filtered = filtered.filter(d => d.category === 'PUBLIC')
    if (category === 'internal') filtered = filtered.filter(d => d.category === 'INTERNAL')
    if (category === 'legal') filtered = filtered.filter(d => d.category === 'LEGAL')
    
    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.key.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    return filtered
  }

  const handleDelete = async () => {
    if (!deleteDialog.document) return

    try {
      setDeleting(true)
      const response = await fetch(`/api/admin/documents/${deleteDialog.document.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Document deleted successfully')
        setDocuments(documents.filter(d => d.id !== deleteDialog.document!.id))
        setDeleteDialog({ open: false, document: null })
      } else {
        toast.error(data.error || 'Failed to delete document')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete document')
    } finally {
      setDeleting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'default'
      case 'DRAFT': return 'secondary'
      case 'REVIEW': return 'outline'
      case 'ARCHIVED': return 'destructive'
      default: return 'outline'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return <CheckCircle className="h-3 w-3" />
      case 'DRAFT': return <Edit className="h-3 w-3" />
      case 'REVIEW': return <AlertCircle className="h-3 w-3" />
      case 'ARCHIVED': return <Trash2 className="h-3 w-3" />
      default: return null
    }
  }

  const DocumentCard = ({ doc }: { doc: Document }) => {
    return (
      <Card className="hover:shadow-md transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-base truncate">{doc.title}</CardTitle>
                {doc.isRequired && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    Required
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs line-clamp-2">
                {doc.description || 'No description'}
              </CardDescription>
            </div>
            <Badge variant={getStatusColor(doc.status)} className="shrink-0">
              {getStatusIcon(doc.status)}
              <span className="ml-1 capitalize">{doc.status.toLowerCase()}</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <code className="text-xs">{doc.key}</code>
            </div>
            {doc.slug && doc.status === 'PUBLISHED' && (
              <div className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                <code className="text-xs">/legal/{doc.slug}</code>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {doc.publishedAt 
                ? `Published ${format(new Date(doc.publishedAt), 'MMM d, yyyy')}`
                : `Updated ${format(new Date(doc.updatedAt), 'MMM d, yyyy')}`
              }
            </div>
            
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => router.push(`/admin/documents/editor?id=${doc.id}`)}
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
              
              {doc.slug && doc.status === 'PUBLISHED' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => window.open(`/legal/${doc.slug}`, '_blank')}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
              
              {doc.status === 'DRAFT' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-destructive hover:text-destructive"
                  onClick={() => setDeleteDialog({ open: true, document: doc })}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return <BrandLoaderInline text="Loading documents..." size="md" />
  }

  const publicDocs = filterDocuments(documents, 'public')
  const internalDocs = filterDocuments(documents, 'internal')
  const legalDocs = filterDocuments(documents, 'legal')

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Legal Library</h1>
          <p className="text-muted-foreground mt-1">
            Manage public policies, internal procedures, and legal agreements
          </p>
        </div>
        <Button onClick={() => router.push('/admin/documents/editor')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Document
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Public Policies</CardDescription>
            <CardTitle className="text-3xl">{documents.filter(d => d.category === 'PUBLIC').length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="default">
                {documents.filter(d => d.category === 'PUBLIC' && d.status === 'PUBLISHED').length} Published
              </Badge>
              <Badge variant="secondary">
                {documents.filter(d => d.category === 'PUBLIC' && d.status === 'DRAFT').length} Draft
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Internal Procedures</CardDescription>
            <CardTitle className="text-3xl">{documents.filter(d => d.category === 'INTERNAL').length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="default">
                {documents.filter(d => d.category === 'INTERNAL' && d.status === 'PUBLISHED').length} Published
              </Badge>
              <Badge variant="secondary">
                {documents.filter(d => d.category === 'INTERNAL' && d.status === 'DRAFT').length} Draft
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Legal Agreements</CardDescription>
            <CardTitle className="text-3xl">{documents.filter(d => d.category === 'LEGAL').length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="default">
                {documents.filter(d => d.category === 'LEGAL' && d.status === 'PUBLISHED').length} Published
              </Badge>
              <Badge variant="secondary">
                {documents.filter(d => d.category === 'LEGAL' && d.status === 'DRAFT').length} Draft
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="public">
            <Globe className="h-4 w-4 mr-2" />
            Public ({publicDocs.length})
          </TabsTrigger>
          <TabsTrigger value="internal">
            <Shield className="h-4 w-4 mr-2" />
            Internal ({internalDocs.length})
          </TabsTrigger>
          <TabsTrigger value="legal">
            <Scale className="h-4 w-4 mr-2" />
            Legal ({legalDocs.length})
          </TabsTrigger>
        </TabsList>

        {/* Public Tab */}
        <TabsContent value="public" className="space-y-4 mt-6">
          <Alert>
            <Globe className="h-4 w-4" />
            <AlertTitle>Public Documents</AlertTitle>
            <AlertDescription>
              These documents are published on your website and accessible to all users.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {publicDocs.length > 0 ? (
              publicDocs.map(doc => <DocumentCard key={doc.id} doc={doc} />)
            ) : (
              <Card className="col-span-2 p-12">
                <div className="text-center text-muted-foreground">
                  {searchQuery ? `No documents found matching "${searchQuery}"` : 'No public documents yet'}
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Internal Tab */}
        <TabsContent value="internal" className="space-y-4 mt-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>Internal Documents</AlertTitle>
            <AlertDescription>
              Internal compliance procedures and policies for your team.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {internalDocs.length > 0 ? (
              internalDocs.map(doc => <DocumentCard key={doc.id} doc={doc} />)
            ) : (
              <Card className="col-span-2 p-12">
                <div className="text-center text-muted-foreground">
                  {searchQuery ? `No documents found matching "${searchQuery}"` : 'No internal documents yet'}
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Legal Tab */}
        <TabsContent value="legal" className="space-y-4 mt-6">
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertTitle>Legal Agreements</AlertTitle>
            <AlertDescription>
              Client agreements, data processing agreements, and partner contracts.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {legalDocs.length > 0 ? (
              legalDocs.map(doc => <DocumentCard key={doc.id} doc={doc} />)
            ) : (
              <Card className="col-span-2 p-12">
                <div className="text-center text-muted-foreground">
                  {searchQuery ? `No documents found matching "${searchQuery}"` : 'No legal documents yet'}
                </div>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, document: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.document?.title}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

