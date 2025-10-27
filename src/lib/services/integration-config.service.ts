/**
 * Integration Configuration Service
 * 
 * Manages integration settings with encrypted storage
 */

import prisma from '@/lib/prisma';
import { encryptionService } from './encryption.service';

export interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

class IntegrationConfigService {
  /**
   * Get integration config
   */
  async getConfig(service: string): Promise<any | null> {
    const integration = await prisma.integrationSetting.findUnique({
      where: { service }
    });

    if (!integration) {
      return null;
    }

    // Decrypt config
    try {
      const decryptedConfig = encryptionService.decryptObject(
        integration.config as string
      );

      return {
        ...integration,
        config: decryptedConfig
      };
    } catch (error) {
      console.error('Failed to decrypt integration config:', error);
      return integration;
    }
  }

  /**
   * Update integration config
   */
  async updateConfig(
    service: string,
    config: Record<string, any>,
    updatedBy: string
  ): Promise<any> {
    // Encrypt config
    const encryptedConfig = encryptionService.encryptObject(config);

    // Update or create
    const integration = await prisma.integrationSetting.upsert({
      where: { service },
      update: {
        config: encryptedConfig as any,
        updatedAt: new Date(),
        updatedBy
      },
      create: {
        service,
        config: encryptedConfig as any,
        isEnabled: true,
        status: 'unconfigured',
        updatedBy
      }
    });

    return integration;
  }

  /**
   * Test integration connection
   */
  async testIntegration(service: string): Promise<TestResult> {
    const integration = await this.getConfig(service);

    if (!integration) {
      return {
        success: false,
        message: 'Integration not configured'
      };
    }

    try {
      switch (service) {
        case 'kycaid':
          return await this.testKycaid(integration.config);
        
        case 'resend':
          return await this.testResend(integration.config);
        
        case 'coingecko':
          return await this.testCoinGecko(integration.config);
        
        default:
          return {
            success: false,
            message: 'Unknown integration service'
          };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Test failed'
      };
    }
  }

  /**
   * Test KYCAID connection
   */
  private async testKycaid(config: any): Promise<TestResult> {
    try {
      // Simple ping test
      const response = await fetch('https://api.kycaid.com/verifications', {
        method: 'GET',
        headers: {
          'Authorization': `Token ${config.apiKey}`
        }
      });

      if (response.ok) {
        return {
          success: true,
          message: 'KYCAID connection successful'
        };
      }

      return {
        success: false,
        message: `KYCAID test failed: ${response.statusText}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `KYCAID connection error: ${error.message}`
      };
    }
  }

  /**
   * Test Resend connection
   */
  private async testResend(config: any): Promise<TestResult> {
    try {
      // Test API key validity
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: config.from,
          to: 'test@resend.dev', // Resend test email
          subject: 'Test Email',
          html: '<p>Test</p>'
        })
      });

      if (response.ok || response.status === 422) {
        // 422 is expected for test email
        return {
          success: true,
          message: 'Resend connection successful'
        };
      }

      return {
        success: false,
        message: `Resend test failed: ${response.statusText}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Resend connection error: ${error.message}`
      };
    }
  }

  /**
   * Test CoinGecko connection
   */
  private async testCoinGecko(config: any): Promise<TestResult> {
    try {
      const response = await fetch(`${config.baseUrl}/ping`);

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: 'CoinGecko connection successful',
          details: data
        };
      }

      return {
        success: false,
        message: `CoinGecko test failed: ${response.statusText}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `CoinGecko connection error: ${error.message}`
      };
    }
  }

  /**
   * Get all integrations
   */
  async getAllIntegrations(): Promise<any[]> {
    const integrations = await prisma.integrationSetting.findMany({
      orderBy: { service: 'asc' }
    });

    // Return without decrypting config (admin UI will decrypt as needed)
    return integrations.map(integration => ({
      ...integration,
      config: undefined, // Don't expose encrypted config in list
      hasConfig: !!integration.config
    }));
  }

  /**
   * Toggle integration enabled status
   */
  async toggleEnabled(service: string, isEnabled: boolean): Promise<any> {
    return await prisma.integrationSetting.update({
      where: { service },
      data: { isEnabled }
    });
  }
}

// Export singleton instance
export const integrationConfigService = new IntegrationConfigService();



