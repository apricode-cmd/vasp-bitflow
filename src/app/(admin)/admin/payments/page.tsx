/**
 * Payment Setup Page
 * 
 * Unified payment configuration: Methods, PSP Connectors, Bank Accounts
 */

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ResourceManager } from '@/components/crm/ResourceManager';
import { CreditCard, Globe, Wallet } from 'lucide-react';

export default function PaymentsPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState('methods');

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Setup</h1>
        <p className="text-muted-foreground mt-1">
          Configure payment methods, PSP connectors, and bank accounts
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="methods" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Payment Methods
          </TabsTrigger>
          <TabsTrigger value="psp" className="gap-2">
            <Globe className="h-4 w-4" />
            PSP Connectors
          </TabsTrigger>
          <TabsTrigger value="banks" className="gap-2">
            <Wallet className="h-4 w-4" />
            Bank Accounts
          </TabsTrigger>
        </TabsList>

        {/* Payment Methods Tab */}
        <TabsContent value="methods" className="mt-6">
          <ResourceManager
            resource="payment methods"
            title="Payment Methods"
            description="Configure available payment options for users"
            apiEndpoint="/api/admin/payment-methods"
            primaryKey="id"
            columns={[
              { key: 'name', label: 'Name' },
              { 
                key: 'type', 
                label: 'Type',
                render: (val) => (
                  <Badge variant={val === 'PSP' ? 'default' : 'secondary'}>
                    {val}
                  </Badge>
                )
              },
              { key: 'minAmount', label: 'Min Amount', type: 'number' },
              { key: 'maxAmount', label: 'Max Amount', type: 'number' },
              { key: 'isActive', label: 'Active', type: 'boolean' },
            ]}
            fields={[
              { name: 'name', label: 'Method Name', type: 'text', required: true, placeholder: 'SEPA Transfer' },
              { 
                name: 'type', 
                label: 'Type', 
                type: 'select', 
                required: true,
                options: [
                  { value: 'PSP', label: 'Payment Service Provider' },
                  { value: 'BANK', label: 'Bank Transfer' }
                ]
              },
              { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Payment method details' },
              { name: 'minAmount', label: 'Minimum Amount (EUR)', type: 'number', placeholder: '10' },
              { name: 'maxAmount', label: 'Maximum Amount (EUR)', type: 'number', placeholder: '50000' },
              { name: 'processingTime', label: 'Processing Time', type: 'text', placeholder: '1-2 business days' },
              { name: 'isActive', label: 'Active', type: 'boolean' },
              { name: 'priority', label: 'Display Priority', type: 'number', placeholder: '0' }
            ]}
          />
        </TabsContent>

        {/* PSP Connectors Tab */}
        <TabsContent value="psp" className="mt-6">
          <ResourceManager
            resource="PSP connectors"
            title="PSP Connectors"
            description="Configure payment service provider integrations"
            apiEndpoint="/api/admin/resources/psp-connectors"
            primaryKey="code"
            columns={[
              { key: 'code', label: 'Code', type: 'badge' },
              { key: 'name', label: 'Provider Name' },
              { 
                key: 'status', 
                label: 'Status',
                render: (val) => (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${val === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <Badge variant={val === 'active' ? 'success' : 'secondary'}>
                      {val}
                    </Badge>
                  </div>
                )
              },
              { key: 'isActive', label: 'Enabled', type: 'boolean' },
            ]}
            fields={[
              { name: 'code', label: 'PSP Code', type: 'text', required: true, placeholder: 'stripe' },
              { name: 'name', label: 'Provider Name', type: 'text', required: true, placeholder: 'Stripe' },
              { name: 'apiEndpoint', label: 'API Endpoint', type: 'text', required: true, placeholder: 'https://api.stripe.com' },
              { name: 'apiKey', label: 'API Key (encrypted)', type: 'text', placeholder: 'sk_live_...' },
              { name: 'webhookSecret', label: 'Webhook Secret', type: 'text', placeholder: 'whsec_...' },
              { name: 'isActive', label: 'Active', type: 'boolean' }
            ]}
          />
        </TabsContent>

        {/* Bank Accounts Tab */}
        <TabsContent value="banks" className="mt-6">
          <ResourceManager
            resource="bank accounts"
            title="Bank Accounts"
            description="Manage company bank accounts for receiving payments"
            apiEndpoint="/api/admin/resources/banks"
            primaryKey="id"
            columns={[
              { key: 'bankName', label: 'Bank' },
              { key: 'accountHolder', label: 'Account Holder' },
              { key: 'accountNumber', label: 'Account Number' },
              { key: 'iban', label: 'IBAN' },
              { key: 'currency', label: 'Currency', type: 'badge' },
              { key: 'isActive', label: 'Active', type: 'boolean' },
            ]}
            fields={[
              { name: 'bankName', label: 'Bank Name', type: 'text', required: true, placeholder: 'Deutsche Bank' },
              { name: 'accountHolder', label: 'Account Holder', type: 'text', required: true, placeholder: 'Apricode Exchange Ltd' },
              { name: 'accountNumber', label: 'Account Number', type: 'text', required: true },
              { name: 'iban', label: 'IBAN', type: 'text', required: true, placeholder: 'DE89...' },
              { name: 'swift', label: 'SWIFT/BIC', type: 'text', placeholder: 'DEUTDEFF' },
              { name: 'currency', label: 'Currency', type: 'text', required: true, placeholder: 'EUR' },
              { name: 'country', label: 'Country', type: 'text', placeholder: 'DE' },
              { name: 'isActive', label: 'Active', type: 'boolean' }
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

