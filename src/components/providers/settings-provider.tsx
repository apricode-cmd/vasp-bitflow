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
  const [settings, setSettings] = useState<PublicSettings>({});
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
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refresh: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

