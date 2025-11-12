/**
 * Settings Provider
 * 
 * Loads public settings from DB and applies them globally:
 * - Primary color (CSS variables)
 * - Brand logo
 * - Brand name
 */

'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import Color from 'color';

interface PublicSettings {
  brandName?: string;
  platformName?: string;
  brandTagline?: string;
  brandLogo?: string;
  brandLogoDark?: string; // Dark mode logo
  primaryColor?: string;
  supportEmail?: string;
  supportPhone?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  registrationEnabled?: boolean;
  kycRequired?: boolean;
  defaultFeePercent?: number;
  minOrderAmount?: number;
  maxOrderAmount?: number;
  currentYear?: number;
}

interface SettingsContextType {
  settings: PublicSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: {},
  loading: true,
  refresh: async () => {}
});

export function useSettings() {
  return useContext(SettingsContext);
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // Preload settings from localStorage to prevent flash
  const [settings, setSettings] = useState<PublicSettings>(() => {
    if (typeof window === 'undefined') return {};
    
    const cached: PublicSettings = {};
    const brandLogo = localStorage.getItem('brand-logo');
    const brandLogoDark = localStorage.getItem('brand-logo-dark');
    const brandName = localStorage.getItem('brand-name');
    
    if (brandLogo) cached.brandLogo = brandLogo;
    if (brandLogoDark) cached.brandLogoDark = brandLogoDark;
    if (brandName) cached.brandName = brandName;
    
    return cached;
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings/public', {
        cache: 'no-store'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings);
        
        // Apply primary color to CSS variables
        if (data.settings.primaryColor) {
          applyPrimaryColor(data.settings.primaryColor);
        }
        
        // Cache logo URLs in localStorage for instant load
        if (data.settings.brandLogo) {
          localStorage.setItem('brand-logo', data.settings.brandLogo);
        }
        if (data.settings.brandLogoDark) {
          localStorage.setItem('brand-logo-dark', data.settings.brandLogoDark);
        }
        if (data.settings.brandName) {
          localStorage.setItem('brand-name', data.settings.brandName);
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyPrimaryColor = (hexColor: string) => {
    try {
      const color = Color(hexColor);
      
      // Get HSL values
      const hue = Math.round(color.hue());
      const saturation = Math.round(color.saturationl());
      const lightness = Math.round(color.lightness());
      
      // Apply to CSS variables
      const root = document.documentElement;
      root.style.setProperty('--primary', `${hue} ${saturation}% ${lightness}%`);
      
      // Save to localStorage for instant load on next visit
      localStorage.setItem('brand-primary-color', hexColor);
      
      console.log('✅ Applied primary color from DB:', hexColor);
    } catch (error) {
      console.error('❌ Invalid primary color:', error);
    }
  };

  useEffect(() => {
    // Preload color from localStorage to prevent flash
    const savedColor = localStorage.getItem('brand-primary-color');
    if (savedColor) {
      applyPrimaryColor(savedColor);
    }
    
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refresh: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

