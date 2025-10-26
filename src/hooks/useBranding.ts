/**
 * useBranding Hook
 * 
 * Fetches and provides branding settings from AdminSettings
 */

'use client';

import { useState, useEffect } from 'react';

interface BrandingSettings {
  companyName: string;
  tagline: string;
  primaryColor: string;
}

const DEFAULT_BRANDING: BrandingSettings = {
  companyName: 'CryptoExchange CRM',
  tagline: 'Secure crypto trading platform',
  primaryColor: 'hsl(var(--primary))'
};

export function useBranding() {
  const [branding, setBranding] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const response = await fetch('/api/admin/settings/public');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.settings) {
            setBranding({
              companyName: data.settings.companyName || DEFAULT_BRANDING.companyName,
              tagline: data.settings.tagline || DEFAULT_BRANDING.tagline,
              primaryColor: data.settings.primaryColor || DEFAULT_BRANDING.primaryColor
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch branding:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBranding();
  }, []);

  return { branding, loading };
}


