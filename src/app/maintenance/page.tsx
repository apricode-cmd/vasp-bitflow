/**
 * Maintenance Mode Page
 * 
 * Displayed when the platform is under maintenance
 */

import { Metadata } from 'next';
import { Construction, Mail, Clock } from 'lucide-react';
import { getPublicSettings } from '@/lib/settings';

export const metadata: Metadata = {
  title: 'Maintenance Mode',
  description: 'Platform is currently under maintenance'
};

export default async function MaintenancePage(): Promise<React.ReactElement> {
  const settings = await getPublicSettings();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          {settings.brandLogo ? (
            <img
              src={settings.brandLogo}
              alt={settings.brandName || 'Logo'}
              className="h-12 mx-auto mb-4"
            />
          ) : (
            <h1 className="text-2xl font-bold text-primary mb-4">
              {settings.brandName || 'Apricode Exchange'}
            </h1>
          )}
        </div>

        {/* Main Card */}
        <div className="bg-card border border-primary/20 rounded-2xl shadow-2xl p-8 md:p-12 text-center backdrop-blur-sm">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
            <Construction className="h-10 w-10 text-primary" />
          </div>

          {/* Title */}
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            We&apos;ll be back soon!
          </h2>

          {/* Description */}
          <p className="text-lg text-muted-foreground mb-8">
            {settings.brandName || 'Our platform'} is currently undergoing scheduled maintenance.
            <br />
            We&apos;re working hard to improve your experience.
          </p>

          {/* Status */}
          <div className="inline-flex items-center gap-3 bg-muted/50 px-6 py-3 rounded-full mb-8">
            <Clock className="h-5 w-5 text-primary animate-pulse" />
            <span className="text-sm font-medium">
              Maintenance in Progress
            </span>
          </div>

          {/* Divider */}
          <div className="border-t my-8" />

          {/* Contact Info */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Need urgent assistance?
            </p>
            {settings.supportEmail && (
              <a
                href={`mailto:${settings.supportEmail}`}
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
              >
                <Mail className="h-4 w-4" />
                <span>{settings.supportEmail}</span>
              </a>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          © {new Date().getFullYear()} {settings.platformName || settings.brandName || 'Apricode Exchange'}
        </p>
      </div>
    </div>
  );
}

