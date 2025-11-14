/**
 * Integration Management Service
 * 
 * Handles activation, deactivation, and secure storage of integration configs
 */

import { prisma } from '@/lib/prisma';
import { encrypt, decrypt, maskApiKey } from './encryption.service';
import { integrationRegistry } from '@/lib/integrations';

interface ActivateIntegrationParams {
  service: string;
  apiKey: string;
  apiEndpoint?: string;
  config?: Record<string, any>;
  userId: string; // Admin who activated
}

interface UpdateIntegrationParams {
  service: string;
  updates: {
    apiKey?: string;
    apiEndpoint?: string;
    config?: Record<string, any>;
    isEnabled?: boolean;
  };
  userId: string;
}

/**
 * Activate an integration
 */
export async function activateIntegration(params: ActivateIntegrationParams) {
  const { service, apiKey, apiEndpoint, config, userId } = params;

  try {
    // Validate that provider exists in registry
    const provider = integrationRegistry.getProvider(service);
    if (!provider) {
      throw new Error(`Integration provider "${service}" not found in registry`);
    }

    // Encrypt sensitive data
    const encryptedApiKey = apiKey ? encrypt(apiKey) : null;

    // Create or update integration
    const integration = await prisma.integration.upsert({
      where: { service },
      update: {
        isEnabled: true,
        status: 'inactive', // Will be set to 'active' after successful test
        apiKey: encryptedApiKey,
        apiEndpoint,
        config: config || {},
        updatedAt: new Date()
      },
      create: {
        service,
        isEnabled: true,
        status: 'inactive',
        apiKey: encryptedApiKey,
        apiEndpoint,
        config: config || {}
      }
    });

    // Log activation
    await prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: userId,
        action: 'INTEGRATION_ACTIVATED',
        entity: 'Integration',
        entityType: 'Integration',
        entityId: integration.id,
        newValue: {
          service,
          isEnabled: true,
          hasApiKey: !!apiKey
        },
        metadata: {
          provider: provider.displayName
        }
      }
    });

    return {
      success: true,
      integration: {
        ...integration,
        apiKey: apiKey ? maskApiKey(apiKey) : null
      }
    };
  } catch (error: any) {
    console.error('Failed to activate integration:', error);
    throw error;
  }
}

/**
 * Deactivate an integration
 */
export async function deactivateIntegration(service: string, userId: string) {
  try {
    const integration = await prisma.integration.findUnique({
      where: { service }
    });

    if (!integration) {
      throw new Error(`Integration "${service}" not found`);
    }

    // Update integration
    const updated = await prisma.integration.update({
      where: { service },
      data: {
        isEnabled: false,
        status: 'inactive',
        updatedAt: new Date()
      }
    });

    // Log deactivation
    await prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: userId,
        action: 'INTEGRATION_DEACTIVATED',
        entity: 'Integration',
        entityType: 'Integration',
        entityId: integration.id,
        oldValue: {
          isEnabled: integration.isEnabled,
          status: integration.status
        },
        newValue: {
          isEnabled: false,
          status: 'inactive'
        }
      }
    });

    return {
      success: true,
      integration: updated
    };
  } catch (error: any) {
    console.error('Failed to deactivate integration:', error);
    throw error;
  }
}

/**
 * Update integration configuration
 */
export async function updateIntegrationConfig(params: UpdateIntegrationParams) {
  const { service, updates, userId } = params;

  try {
    const integration = await prisma.integration.findUnique({
      where: { service }
    });

    // If integration doesn't exist, create it with minimal data
    if (!integration) {
      const hasApiKey = !!updates.apiKey;
      const isEnabled = updates.isEnabled ?? false;
      
      const created = await prisma.integration.create({
        data: {
          service,
          isEnabled,
          // Set status based on isEnabled and API key presence
          status: (isEnabled && hasApiKey) ? 'active' : 'inactive',
          apiKey: updates.apiKey ? encrypt(updates.apiKey) : null,
          apiEndpoint: updates.apiEndpoint,
          config: updates.config || {}
        }
      });

      // Log creation
      await prisma.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorId: userId,
          action: 'INTEGRATION_CREATED',
          entity: 'Integration',
          entityType: 'Integration',
          entityId: created.id,
          newValue: {
            service,
            isEnabled: created.isEnabled,
            hasApiKey: !!created.apiKey
          }
        }
      });

      return {
        success: true,
        integration: {
          ...created,
          apiKey: created.apiKey ? maskApiKey(decrypt(created.apiKey)) : null
        }
      };
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };

    if (updates.apiKey !== undefined) {
      // Don't save masked API keys (containing • or *)
      const isMasked = updates.apiKey && (
        updates.apiKey.includes('•') || 
        updates.apiKey.includes('*') ||
        /[^\x00-\x7F]/.test(updates.apiKey)
      );
      
      if (!isMasked && updates.apiKey) {
        // Check if it's already encrypted (double encryption prevention)
        const isAlreadyEncrypted = updates.apiKey.startsWith('encrypted:') || updates.apiKey.startsWith('plain:');
        
        if (isAlreadyEncrypted) {
          console.warn('⚠️ Attempting to encrypt already encrypted key - skipping');
          // Keep existing key
        } else {
          console.log('✅ Encrypting new API key for', service);
          updateData.apiKey = encrypt(updates.apiKey);
          // If adding/updating API key and integration is enabled, set to active
          if (integration.isEnabled) {
            updateData.status = 'active';
          }
        }
      } else if (isMasked) {
        console.warn('⚠️ Skipping masked API key update');
        // Keep existing key
      } else {
        // Explicitly clearing the key
        console.log('🗑️ Clearing API key for', service);
        updateData.apiKey = null;
      }
    }

    if (updates.apiEndpoint !== undefined) {
      updateData.apiEndpoint = updates.apiEndpoint;
    }

    if (updates.config !== undefined) {
      updateData.config = updates.config;
    }

    if (updates.isEnabled !== undefined) {
      updateData.isEnabled = updates.isEnabled;
      
      // If enabling a KYC provider, disable all other KYC providers
      if (updates.isEnabled) {
        const provider = integrationRegistry.getProvider(service);
        if (provider && provider.category === 'KYC') {
          console.log('🔄 Enabling KYC provider, disabling others...');
          
          // Find all other KYC integrations and disable them
          const allKycIntegrations = await prisma.integration.findMany({
            where: {
              service: { not: service }
            }
          });
          
          for (const kycInt of allKycIntegrations) {
            const kycProvider = integrationRegistry.getProvider(kycInt.service);
            if (kycProvider && kycProvider.category === 'KYC' && kycInt.isEnabled) {
              await prisma.integration.update({
                where: { service: kycInt.service },
                data: {
                  isEnabled: false,
                  status: 'inactive',
                  updatedAt: new Date()
                }
              });
              
              console.log(`✅ Disabled KYC provider: ${kycInt.service}`);
              
              // Log deactivation
              await prisma.auditLog.create({
                data: {
                  actorType: 'ADMIN',
                  actorId: userId,
                  action: 'INTEGRATION_AUTO_DEACTIVATED',
                  entity: 'Integration',
                  entityType: 'Integration',
                  entityId: kycInt.id,
                  oldValue: { isEnabled: true },
                  newValue: { isEnabled: false },
                  metadata: {
                    reason: `Auto-disabled when ${service} was enabled`,
                    triggeredBy: service
                  }
                }
              });
            }
          }
        }
        
        // When enabling, set to active if API key exists (including new one)
        // OR if config has required fields (for multi-param integrations like Sumsub)
        // OR if it's a RATES provider (they don't require API keys - use public APIs)
        const hasApiKey = integration.apiKey || updates.apiKey;
        const hasConfigData = updates.config && Object.keys(updates.config).length > 0;
        const isRatesProvider = provider && provider.category === 'RATES';
        
        if (hasApiKey || hasConfigData || isRatesProvider) {
          updateData.status = 'active';
        } else {
          updateData.status = 'inactive'; // No API key yet
        }
      } else {
        // When disabling, always set to inactive
        updateData.status = 'inactive';
      }
    }

    // Update integration
    const updated = await prisma.integration.update({
      where: { service },
      data: updateData
    });

    // Log update
    await prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: userId,
        action: 'INTEGRATION_UPDATED',
        entity: 'Integration',
        entityType: 'Integration',
        entityId: integration.id,
        oldValue: {
          isEnabled: integration.isEnabled,
          status: integration.status,
          hasApiKey: !!integration.apiKey
        },
        newValue: {
          isEnabled: updated.isEnabled,
          status: updated.status,
          hasApiKey: !!updated.apiKey,
          updated: Object.keys(updates)
        }
      }
    });

    return {
      success: true,
      integration: {
        ...updated,
        apiKey: updated.apiKey ? maskApiKey(decrypt(updated.apiKey)) : null
      }
    };
  } catch (error: any) {
    console.error('Failed to update integration:', error);
    throw error;
  }
}

/**
 * Get integration with decrypted API key (for testing/usage)
 */
export async function getIntegrationWithSecrets(service: string) {
  const integration = await prisma.integration.findUnique({
    where: { service }
  });

  if (!integration) {
    return null;
  }

  return {
    ...integration,
    apiKey: integration.apiKey ? decrypt(integration.apiKey) : null
  };
}

/**
 * Get integration for display (with masked API key)
 */
export async function getIntegrationForDisplay(service: string) {
  const integration = await prisma.integration.findUnique({
    where: { service }
  });

  if (!integration) {
    return null;
  }

  return {
    ...integration,
    apiKey: integration.apiKey ? maskApiKey(decrypt(integration.apiKey)) : null
  };
}

/**
 * Test integration connection
 */
export async function testIntegrationConnection(service: string, userId: string) {
  try {
    // Get integration with real API key
    const integration = await getIntegrationWithSecrets(service);
    
    if (!integration) {
      throw new Error(`Integration "${service}" not found`);
    }

    if (!integration.isEnabled) {
      throw new Error('Integration is disabled');
    }

    console.log('🧪 Testing integration:', service);
    
    // Clean API key (remove any prefixes or extra characters)
    let cleanApiKey = integration.apiKey || '';
    
    // If key looks like it has non-ASCII chars, it might be corrupted
    if (cleanApiKey && /[^\x00-\x7F]/.test(cleanApiKey)) {
      console.warn('⚠️ API key contains non-ASCII characters, cleaning...');
      // Try to extract just ASCII characters
      cleanApiKey = cleanApiKey.replace(/[^\x00-\x7F]/g, '');
    }

    // Get provider from registry
    const provider = integrationRegistry.getProvider(service);
    
    if (!provider) {
      throw new Error(`Provider "${service}" not found in registry`);
    }

    // Initialize provider with config
    await provider.initialize({
      apiKey: cleanApiKey,
      apiEndpoint: integration.apiEndpoint || undefined,
      ...integration.config
    });

    // Test connection
    const testResult = await provider.test();

    // Update status based on test result
    const newStatus = testResult.success ? 'active' : 'error';
    
    await prisma.integration.update({
      where: { service },
      data: {
        status: newStatus,
        lastTested: new Date()
      }
    });

    // Log test
    await prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: userId,
        action: 'INTEGRATION_TESTED',
        entity: 'Integration',
        entityType: 'Integration',
        entityId: integration.id,
        newValue: {
          success: testResult.success,
          status: newStatus,
          message: testResult.message
        }
      }
    });

    return {
      success: testResult.success,
      message: testResult.message,
      status: newStatus
    };
  } catch (error: any) {
    console.error('Integration test failed:', error);
    
    // Update to error status
    await prisma.integration.update({
      where: { service },
      data: {
        status: 'error',
        lastTested: new Date()
      }
    }).catch(() => {});

    throw error;
  }
}

