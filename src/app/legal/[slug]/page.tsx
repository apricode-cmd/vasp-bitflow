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
      {/* Modern Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-5xl mx-auto">
          <div className="flex h-16 items-center justify-between px-4 md:px-6">
            {/* Logo */}
            <Link 
              href="/"
              className="flex items-center gap-2.5 group"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-xl blur-sm group-hover:blur-md transition-all" />
                <div className="relative rounded-xl bg-gradient-to-br from-primary to-primary/80 p-2 shadow-sm group-hover:shadow-md transition-all">
                  <Shield className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
              <div className="flex flex-col -space-y-0.5">
                <span className="text-sm font-semibold tracking-tight leading-none">
                  Apricode Exchange
                </span>
                <span className="text-[10px] text-muted-foreground font-medium leading-none hidden sm:block">
                  Legal & Compliance
                </span>
              </div>
            </Link>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hidden sm:flex h-9 px-4 rounded-lg hover:bg-primary/5"
                >
                  <span className="text-sm font-medium">Sign In</span>
                </Button>
              </Link>
              
              <div className="h-5 w-px bg-border hidden sm:block" />
              
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Modern Design */}
      <div className="border-b">
        <div className="container max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-10">
          <div className="flex flex-col gap-6">
            {/* Document Badge */}
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-foreground">
                  Legal Document
                </span>
              </div>
              
              {document.isRequired && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <FileCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    Required
                  </span>
                </div>
              )}
            </div>

            {/* Title & Description */}
            <div className="space-y-3 max-w-3xl">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                <span className="bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                  {document.title}
                </span>
              </h1>
              
              {document.description && (
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  {document.description}
                </p>
              )}
            </div>

            {/* Metadata & Actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider font-medium opacity-60">
                      Published
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {document.publishedAt ? format(new Date(document.publishedAt), 'MMM d, yyyy') : 'N/A'}
                    </span>
                  </div>
                </div>
                
                <div className="h-8 w-px bg-border" />
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider font-medium opacity-60">
                      Updated
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {format(new Date(document.updatedAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <QuickActions />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1">
        <div className="container max-w-5xl mx-auto px-4 md:px-6 py-10 md:py-14">
          <LegalPageClient htmlContent={document.htmlContent} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 mt-auto">
        <div className="container max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-sm">
            {/* Left: Copyright */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex flex-col -space-y-0.5">
                  <span className="text-xs font-semibold">Apricode Exchange</span>
                  <span className="text-[10px] text-muted-foreground">
                    © {new Date().getFullYear()} All rights reserved
                  </span>
                </div>
              </div>
            </div>

            {/* Center: Links */}
            <div className="flex items-center gap-6">
              <Link 
                href="/legal/terms-of-service" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms
              </Link>
              <Link 
                href="/legal/privacy-policy" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy
              </Link>
              <Link 
                href="/contact" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Contact
              </Link>
            </div>

            {/* Right: Powered by */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Powered by</span>
              <a 
                href="https://apricode.io" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-primary hover:text-primary/80 transition-colors"
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
