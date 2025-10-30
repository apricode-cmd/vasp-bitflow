/**
 * Client Footer Component
 * 
 * Minimalistic footer for client dashboard with white-label support
 */

'use client';

import Link from 'next/link';
import { useSettings } from '@/components/providers/settings-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { ApricodeLogo } from '@/components/icons/ApricodeLogo';
import { Mail, Phone, MessageCircle, Copy, CheckCircle, Scale, ExternalLink } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface LegalDocument {
  id: string;
  title: string;
  slug: string;
  description: string | null;
}

export function ClientFooter(): React.ReactElement {
  const { settings, loading } = useSettings();
  const version = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [legalDocuments, setLegalDocuments] = useState<LegalDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  // Use server-provided year, fallback to client-side
  const currentYear = settings.currentYear || new Date().getFullYear();
  const companyName = settings.platformName || settings.brandName || 'Apricode Exchange';

  // Fetch legal documents for footer menu
  useEffect(() => {
    const fetchLegalDocuments = async () => {
      try {
        const response = await fetch('/api/legal-documents/public');
        const data = await response.json();
        
        if (data.success) {
          setLegalDocuments(data.documents || []);
        }
      } catch (error) {
        console.error('Failed to fetch legal documents:', error);
      } finally {
        setLoadingDocs(false);
      }
    };

    fetchLegalDocuments();
  }, []);

  const handleCopyEmail = () => {
    if (settings.supportEmail) {
      navigator.clipboard.writeText(settings.supportEmail);
      setCopiedEmail(true);
      toast.success('Email copied to clipboard');
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const handleCopyPhone = () => {
    if (settings.supportPhone) {
      navigator.clipboard.writeText(settings.supportPhone);
      setCopiedPhone(true);
      toast.success('Phone copied to clipboard');
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  return (
    <footer className="border-t bg-card/30 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          {/* Left: Copyright */}
          <div className="flex items-center gap-1">
            {loading ? (
              <Skeleton className="h-4 w-48" />
            ) : (
              <>
                <span>© {currentYear}</span>
                <span className="font-medium text-foreground">
                  {companyName}
                </span>
                <span className="hidden sm:inline">• All rights reserved</span>
              </>
            )}
          </div>

          {/* Center: Links */}
          <div className="flex items-center gap-6">
            {/* Legal Documents Popover */}
            {!loadingDocs && legalDocuments.length > 0 ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="hover:text-foreground transition cursor-pointer flex items-center gap-1 group">
                    <Scale className="h-3.5 w-3.5 group-hover:text-primary transition" />
                    <span>Legal</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent 
                  side="top" 
                  align="center"
                  className="w-72 p-4 animate-in slide-in-from-bottom-2"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Scale className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold text-sm">Legal Documents</h4>
                    </div>
                    
                    <div className="space-y-1">
                      {legalDocuments.map((doc) => (
                        <Link
                          key={doc.id}
                          href={`/legal/${doc.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors group"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition flex-shrink-0" />
                          <p className="text-sm font-medium group-hover:text-primary transition">
                            {doc.title}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ) : loadingDocs ? (
              <Skeleton className="h-4 w-12" />
            ) : (
              <span className="text-muted-foreground cursor-not-allowed">Legal</span>
            )}
            
            {/* Support Popover */}
            {(settings.supportEmail || settings.supportPhone) ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="hover:text-foreground transition cursor-pointer flex items-center gap-1 group">
                    <MessageCircle className="h-3.5 w-3.5 group-hover:text-primary transition" />
                    <span>Support</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent 
                  side="top" 
                  align="center"
                  className="w-72 p-4 animate-in slide-in-from-bottom-2"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <MessageCircle className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold text-sm">Contact Support</h4>
                    </div>
                    
                    {settings.supportEmail && (
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground">Email</p>
                        <div className="flex items-center gap-2">
                          <a 
                            href={`mailto:${settings.supportEmail}`}
                            className="flex items-center gap-2 text-sm flex-1 group"
                          >
                            <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="group-hover:text-primary transition truncate">
                              {settings.supportEmail}
                            </span>
                          </a>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={handleCopyEmail}
                          >
                            {copiedEmail ? (
                              <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {settings.supportPhone && (
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <div className="flex items-center gap-2">
                          <a 
                            href={`tel:${settings.supportPhone}`}
                            className="flex items-center gap-2 text-sm flex-1 group"
                          >
                            <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="group-hover:text-primary transition">
                              {settings.supportPhone}
                            </span>
                          </a>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={handleCopyPhone}
                          >
                            {copiedPhone ? (
                              <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <Link 
                href="/dashboard" 
                className="hover:text-foreground transition"
              >
                Support
              </Link>
            )}
          </div>

          {/* Right: Developer & Version */}
          <div className="flex items-center gap-4">
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md font-mono text-xs">
              v{version}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs">Powered by</span>
              <a 
                href="https://apricode.agency" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 font-semibold text-primary hover:text-primary/80 transition-colors group"
              >
                <ApricodeLogo size={14} className="text-primary group-hover:text-primary/80 transition-colors" />
                <span>Apricode</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

