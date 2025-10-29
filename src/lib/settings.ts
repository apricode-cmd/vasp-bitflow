/**
 * Server-side Settings Helper
 * 
 * Get public settings on server side (for Server Components)
 */

import { prisma } from '@/lib/prisma';

export interface PublicSettings {
  brandName?: string;
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
}

export async function getPublicSettings(): Promise<PublicSettings> {
  try {
    const settings = await prisma.systemSettings.findMany({
      where: {
        isPublic: true
      },
      select: {
        key: true,
        value: true,
        type: true
      },
      cacheStrategy: {
        ttl: 60, // Cache for 60 seconds
        swr: 120
      }
    });

    // Convert array to object with type conversion
    const settingsObject: PublicSettings = {};
    
    settings.forEach(setting => {
      let value: any = setting.value;
      
      if (setting.type === 'BOOLEAN') {
        value = setting.value === 'true';
      } else if (setting.type === 'NUMBER') {
        value = parseFloat(setting.value);
      } else if (setting.type === 'JSON') {
        try {
          value = JSON.parse(setting.value);
        } catch {
          value = setting.value;
        }
      }
      
      (settingsObject as any)[setting.key] = value;
    });

    return settingsObject;
  } catch (error) {
    console.error('Failed to get public settings:', error);
    return {};
  }
}

