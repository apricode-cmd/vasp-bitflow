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
    <div className="min-h-screen flex flex-col">
      {/* Dynamic Island Style Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4 pointer-events-none">
        <header className="pointer-events-auto w-full max-w-4xl rounded-2xl border border-border/50 bg-background/80 backdrop-blur-xl shadow-lg shadow-black/5 dark:shadow-black/20">
          <div className="flex h-12 items-center justify-between px-4">
            {/* Logo */}
            <Link 
              href="/"
              className="group flex items-center gap-2"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70">
                <Shield className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold">Apricode</span>
            </Link>
            
            {/* Center: Document Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 border border-border/30">
              <FileText className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium">Legal</span>
            </div>
            
            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="/login">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-7 px-3 text-xs font-medium rounded-lg"
                >
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </header>
      </div>

      {/* Spacer */}
      <div className="h-20" />

      {/* Hero with Gradient */}
      <div className="relative border-b overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col gap-6">
            {/* Badges Row */}
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm px-3 py-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">Legal Document</span>
              </div>
              {document.isRequired && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 backdrop-blur-sm px-3 py-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Required Reading</span>
                </div>
              )}
            </div>

            {/* Title Section */}
            <div className="space-y-4 max-w-3xl">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                {document.title}
              </h1>
              
              {document.description && (
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {document.description}
                </p>
              )}
            </div>

            {/* Meta Row */}
            <div className="flex flex-wrap items-center gap-6 pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 backdrop-blur-sm">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider font-medium opacity-60">Published</span>
                  <span className="text-xs font-medium text-foreground">{document.publishedAt ? format(new Date(document.publishedAt), 'MMM d, yyyy') : 'N/A'}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 backdrop-blur-sm">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider font-medium opacity-60">Updated</span>
                  <span className="text-xs font-medium text-foreground">{format(new Date(document.updatedAt), 'MMM d, yyyy')}</span>
                </div>
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
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8">
            {/* Sticky TOC Navigation */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-3">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2">
                  Contents
                </div>
                <nav className="space-y-0.5" id="toc-nav">
                  {/* TOC will be populated by client component */}
                  <div className="text-xs text-muted-foreground px-2 py-1.5">
                    Loading...
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
      <footer className="border-t mt-auto">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10">
                <Shield className="h-2.5 w-2.5 text-primary" />
              </div>
              <span className="font-medium">© {new Date().getFullYear()} Apricode Exchange</span>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/legal/terms-of-service" className="text-muted-foreground hover:text-foreground transition">
                Terms
              </Link>
              <Link href="/legal/privacy-policy" className="text-muted-foreground hover:text-foreground transition">
                Privacy
              </Link>
              <Link href="/contact" className="text-muted-foreground hover:text-foreground transition">
                Contact
              </Link>
            </div>

            <a 
              href="https://apricode.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition"
            >
              <span>by</span>
              <span className="font-semibold">Apricode</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
