import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getPublicSettings } from '@/lib/settings';
import { Button } from '@/components/ui/button';
import { 
  FileText, Calendar, Shield, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LegalPageClient } from '@/components/legal/LegalPageClient';
import { QuickActions } from '@/components/legal/QuickActions';
import { ClientFooter } from '@/components/layouts/ClientFooter';
import { LegalPageLogo } from '@/components/legal/LegalPageLogo';

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
  const settings = await getPublicSettings();

  if (!document) {
    notFound();
  }

  const categoryColors = {
    PUBLIC: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    INTERNAL: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
    LEGAL: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  };

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background">
      {/* Dynamic Island Style Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4 pointer-events-none">
        <header className="pointer-events-auto w-full max-w-4xl rounded-2xl border border-border/50 bg-background/80 backdrop-blur-xl shadow-lg shadow-black/5 dark:shadow-black/20">
          <div className="flex h-12 items-center justify-between px-4">
            {/* Logo */}
            <Link 
              href="/"
              className="group flex items-center gap-2"
            >
              <LegalPageLogo settings={settings} />
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

      {/* Hero - прозрачный с blur */}
      <div className="border-b border-border/50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col gap-8">
            {/* Badges Row */}
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-background/15 backdrop-blur-md px-3 py-1.5 shadow-sm">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">Legal Document</span>
              </div>
              {document.isRequired && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 backdrop-blur-md px-3 py-1.5 shadow-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Required</span>
                </div>
              )}
            </div>

            {/* Title Section */}
            <div className="space-y-4 max-w-3xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent leading-[1.1]">
                {document.title}
              </h1>
              
              {document.description && (
                <p className="text-lg md:text-xl text-muted-foreground/80 leading-relaxed font-light">
                  {document.description}
                </p>
              )}
            </div>

            {/* Meta Row with Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
              {/* Left: Meta Info */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 opacity-50" />
                  <span className="text-xs">{document.publishedAt ? format(new Date(document.publishedAt), 'MMM d, yyyy') : 'N/A'}</span>
                </div>
                
                <div className="h-3 w-px bg-border/50" />
                
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 opacity-50" />
                  <span className="text-xs">Updated {format(new Date(document.updatedAt), 'MMM d, yyyy')}</span>
                </div>
              </div>

              {/* Right: Quick Actions */}
              <QuickActions />
            </div>
          </div>
        </div>
      </div>

      {/* Content with Sidebar Navigation - прозрачный с blur */}
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

      {/* Client Footer */}
      <ClientFooter />
    </div>
  );
}
