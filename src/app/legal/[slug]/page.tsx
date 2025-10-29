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
    <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="flex items-center gap-2 font-semibold text-lg hover:opacity-80 transition-opacity"
            >
              <div className="rounded-lg bg-primary/10 p-2 ring-1 ring-primary/20">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <span className="hidden sm:inline bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Apricode Exchange
              </span>
            </Link>
            
            <Separator orientation="vertical" className="h-6" />
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="rounded-md bg-primary/5 p-1">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <span className="hidden md:inline">Legal Document</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                Sign In
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="border-b bg-muted/30">
        <div className="container max-w-4xl mx-auto px-4 md:px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            {/* Left: Title & Meta */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold mb-3 bg-gradient-to-br from-primary to-foreground bg-clip-text text-transparent">
                {document.title}
              </h1>
              
              {document.description && (
                <p className="text-sm text-muted-foreground mb-3">
                  {document.description}
                </p>
              )}

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  <span>{document.publishedAt ? format(new Date(document.publishedAt), 'MMM d, yyyy') : 'N/A'}</span>
                </div>
                
                <Separator orientation="vertical" className="h-3" />
                
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  <span>{format(new Date(document.updatedAt), 'MMM d, yyyy')}</span>
                </div>

                {document.isRequired && (
                  <>
                    <Separator orientation="vertical" className="h-3" />
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <FileCheck className="h-3 w-3" />
                      <span>Required</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right: Quick Actions */}
            <QuickActions />
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1">
        <div className="container max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
          <LegalPageClient htmlContent={document.htmlContent} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/30 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            {/* Left: Copyright */}
            <div className="flex items-center gap-1">
              <span>© {new Date().getFullYear()}</span>
              <span className="font-medium text-foreground">Apricode Exchange</span>
              <span className="hidden sm:inline">• All rights reserved</span>
            </div>

            {/* Center: Links */}
            <div className="flex items-center gap-6">
              <Link 
                href="/legal/terms-of-service" 
                className="hover:text-foreground transition"
              >
                Terms
              </Link>
              <Link 
                href="/legal/privacy-policy" 
                className="hover:text-foreground transition"
              >
                Privacy
              </Link>
              <Link 
                href="/contact" 
                className="hover:text-foreground transition"
              >
                Contact
              </Link>
            </div>

            {/* Right: Powered by */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs">Powered by</span>
              <a 
                href="https://apricode.io" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Apricode</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
