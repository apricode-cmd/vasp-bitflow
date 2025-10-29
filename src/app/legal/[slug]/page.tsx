import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
  FileText, Calendar, Shield, Clock, FileCheck
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LegalPageClient } from '@/components/legal/LegalPageClient';
import { QuickActions } from '@/components/legal/QuickActions';

interface LegalPageProps {
  params: {
    slug: string;
  };
}

async function getDocument(slug: string) {
  const document = await prisma.legalDocument.findFirst({
    where: {
      slug,
      status: 'PUBLISHED',
      isPublic: true,
    },
    select: {
      id: true,
      title: true,
      description: true,
      slug: true,
      category: true,
      content: true,
      htmlContent: true,
      publishedAt: true,
      updatedAt: true,
      version: true,
      isRequired: true,
      metaTitle: true,
      metaDescription: true,
      ogImage: true,
    },
  });

  if (!document) {
    return null;
  }

  return document;
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
  const document = await getDocument(params.slug);

  if (!document) {
    return {
      title: 'Document Not Found',
    };
  }

  return {
    title: document.metaTitle || document.title,
    description: document.metaDescription || document.description,
    openGraph: {
      title: document.metaTitle || document.title,
      description: document.metaDescription || document.description,
      images: document.ogImage ? [document.ogImage] : [],
    },
  };
}

export default async function LegalPage({ params }: LegalPageProps) {
  const document = await getDocument(params.slug);

  if (!document) {
    notFound();
  }

  const categoryColors = {
    PUBLIC: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    INTERNAL: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
    LEGAL: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Compact Glassmorphism Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <Link 
              href="/"
              className="group flex items-center gap-2"
            >
              <div className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary/70 shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:shadow-primary/30">
                <Shield className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold">Apricode</span>
            </Link>
            
            {/* Center: Document Badge */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/50 backdrop-blur-sm border border-border/50">
              <FileText className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium">Legal Document</span>
            </div>
            
            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              
              <Link href="/login">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 px-3 text-xs font-medium"
                >
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Spacer */}
      <div className="h-14" />

      {/* Compact Hero */}
      <div className="border-b bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex flex-col gap-4 max-w-3xl">
            {/* Badges */}
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border bg-background/80 backdrop-blur-sm px-2.5 py-1 text-xs">
                <FileText className="h-3 w-3 text-primary" />
                <span className="font-medium">Legal</span>
              </div>
              {document.isRequired && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs">
                  <div className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />
                  <span className="font-medium text-amber-700 dark:text-amber-400">Required</span>
                </div>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              {document.title}
            </h1>
            
            {document.description && (
              <p className="text-base text-muted-foreground">
                {document.description}
              </p>
            )}

            {/* Meta */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                <span>{document.publishedAt ? format(new Date(document.publishedAt), 'MMM d, yyyy') : 'N/A'}</span>
              </div>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                <span>{format(new Date(document.updatedAt), 'MMM d, yyyy')}</span>
              </div>
              <div className="ml-auto">
                <QuickActions />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content with Sidebar Navigation */}
      <div className="flex-1">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
            {/* Sticky TOC Navigation */}
            <aside className="hidden lg:block">
              <div className="sticky top-20 space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3">
                  On This Page
                </div>
                <nav className="space-y-1" id="toc-nav">
                  {/* TOC will be populated by client component */}
                  <div className="text-sm text-muted-foreground px-3 py-2">
                    Loading sections...
                  </div>
                </nav>
              </div>
            </aside>

            {/* Document Content */}
            <main className="min-w-0">
              <LegalPageClient htmlContent={document.htmlContent} />
            </main>
          </div>
        </div>
      </div>

      {/* Compact Footer */}
      <footer className="border-t bg-muted/20 mt-auto">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                <Shield className="h-3 w-3 text-primary" />
              </div>
              <span className="text-xs font-medium">© {new Date().getFullYear()} Apricode Exchange</span>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/legal/terms-of-service" className="text-xs text-muted-foreground hover:text-foreground transition">
                Terms
              </Link>
              <Link href="/legal/privacy-policy" className="text-xs text-muted-foreground hover:text-foreground transition">
                Privacy
              </Link>
              <Link href="/contact" className="text-xs text-muted-foreground hover:text-foreground transition">
                Contact
              </Link>
            </div>

            <a 
              href="https://apricode.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition"
            >
              <span>Powered by</span>
              <span className="font-semibold">Apricode</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
