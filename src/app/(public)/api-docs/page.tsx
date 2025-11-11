/**
 * API Documentation Page (Public)
 * 
 * Interactive API documentation powered by Scalar
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Book, Code, Key, Zap, Shield, ExternalLink, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ApiDocsPage() {

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Apricode Exchange API
              </h1>
              <p className="text-muted-foreground mt-2">
                Enterprise-grade cryptocurrency exchange API · Version 1.0
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-3 py-1">
                <Zap className="w-3 h-3 mr-1" />
                v1.0
              </Badge>
              <Button asChild>
                <Link href="/admin/api-keys">
                  <Key className="w-4 h-4 mr-2" />
                  Get API Key
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">
              <Book className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="reference">
              <Code className="w-4 h-4 mr-2" />
              API Reference
            </TabsTrigger>
            <TabsTrigger value="authentication">
              <Shield className="w-4 h-4 mr-2" />
              Authentication
            </TabsTrigger>
            <TabsTrigger value="examples">
              <ExternalLink className="w-4 h-4 mr-2" />
              Examples
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Welcome to Apricode Exchange API</CardTitle>
                <CardDescription>
                  Build powerful cryptocurrency exchange applications with our RESTful API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  The Apricode Exchange API provides a comprehensive set of endpoints for integrating
                  cryptocurrency exchange functionality into your applications. Our API supports
                  real-time exchange rates, order management, KYC verification, and more.
                </p>

                <div className="grid md:grid-cols-3 gap-4 mt-6">
                  <div className="p-4 border rounded-lg">
                    <Zap className="w-8 h-8 text-primary mb-2" />
                    <h3 className="font-semibold mb-1">Fast & Reliable</h3>
                    <p className="text-sm text-muted-foreground">
                      99.9% uptime with low-latency responses
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <Shield className="w-8 h-8 text-primary mb-2" />
                    <h3 className="font-semibold mb-1">Secure</h3>
                    <p className="text-sm text-muted-foreground">
                      API key authentication with rate limiting
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <Code className="w-8 h-8 text-primary mb-2" />
                    <h3 className="font-semibold mb-1">Developer Friendly</h3>
                    <p className="text-sm text-muted-foreground">
                      RESTful design with comprehensive docs
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Start */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Start</CardTitle>
                <CardDescription>Get started with the API in minutes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold">Get API Key</h4>
                      <p className="text-sm text-muted-foreground">
                        Create an API key from your admin dashboard
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold">Make Your First Request</h4>
                      <p className="text-sm text-muted-foreground">
                        Use your API key to authenticate requests
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold">Build Your Integration</h4>
                      <p className="text-sm text-muted-foreground">
                        Explore our endpoints and start building
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card>
              <CardHeader>
                <CardTitle>API Features</CardTitle>
                <CardDescription>What you can do with our API</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-semibold">Exchange Rates</h4>
                      <p className="text-sm text-muted-foreground">
                        Real-time cryptocurrency exchange rates
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-semibold">Order Management</h4>
                      <p className="text-sm text-muted-foreground">
                        Create and track cryptocurrency orders
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-semibold">Currency Info</h4>
                      <p className="text-sm text-muted-foreground">
                        Get supported cryptocurrencies and fiat currencies
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-semibold">Webhooks</h4>
                      <p className="text-sm text-muted-foreground">
                        Real-time notifications for order events
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Reference Tab */}
          <TabsContent value="reference">
            <Card>
              <CardHeader>
                <CardTitle>API Reference</CardTitle>
                <CardDescription>
                  Interactive API documentation powered by Scalar
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="w-full" style={{ height: '800px' }}>
                  <iframe
                    src="/scalar-ui.html"
                    className="w-full h-full border-0"
                    title="API Documentation"
                    style={{ minHeight: '800px' }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Authentication Tab */}
          <TabsContent value="authentication" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Authentication</CardTitle>
                <CardDescription>How to authenticate your API requests</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  All API requests require authentication using an API key. Include your API key
                  in the <code className="px-2 py-1 bg-muted rounded">X-API-Key</code> header.
                </p>

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Example Request</h4>
                  <pre className="text-sm overflow-x-auto">
                    <code>{`curl -X GET https://api.apricode.exchange/v1/rates \\
  -H "X-API-Key: your_api_key_here"`}</code>
                  </pre>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-2">
                    🔒 Security Best Practices
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Never share your API key publicly</li>
                    <li>Store API keys securely (environment variables)</li>
                    <li>Rotate keys regularly</li>
                    <li>Use different keys for development and production</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rate Limiting</CardTitle>
                <CardDescription>API request limits and quotas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  API requests are rate-limited to ensure fair usage and system stability.
                </p>

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">Default Limit</h4>
                      <p className="text-sm text-muted-foreground">Standard API key</p>
                    </div>
                    <Badge>100 requests/minute</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">Enterprise Limit</h4>
                      <p className="text-sm text-muted-foreground">Enterprise API key</p>
                    </div>
                    <Badge>1000 requests/minute</Badge>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Rate Limit Headers</h4>
                  <pre className="text-sm overflow-x-auto">
                    <code>{`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000`}</code>
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Examples Tab */}
          <TabsContent value="examples" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Code Examples</CardTitle>
                <CardDescription>Sample code in different languages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* JavaScript Example */}
                <div>
                  <h4 className="font-semibold mb-3">JavaScript / Node.js</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
                      <code>{`// Get exchange rates
const response = await fetch('https://api.apricode.exchange/v1/rates', {
  headers: {
    'X-API-Key': process.env.API_KEY
  }
});

const data = await response.json();
console.log(data);

// Create an order
const order = await fetch('https://api.apricode.exchange/v1/orders', {
  method: 'POST',
  headers: {
    'X-API-Key': process.env.API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    currencyCode: 'BTC',
    fiatCurrencyCode: 'EUR',
    fiatAmount: 1000,
    walletAddress: 'bc1q...'
  })
});

const orderData = await order.json();
console.log(orderData);`}</code>
                    </pre>
                  </div>
                </div>

                {/* Python Example */}
                <div>
                  <h4 className="font-semibold mb-3">Python</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
                      <code>{`import requests
import os

API_KEY = os.getenv('API_KEY')
BASE_URL = 'https://api.apricode.exchange/v1'

# Get exchange rates
response = requests.get(
    f'{BASE_URL}/rates',
    headers={'X-API-Key': API_KEY}
)
rates = response.json()
print(rates)

# Create an order
order_data = {
    'currencyCode': 'BTC',
    'fiatCurrencyCode': 'EUR',
    'fiatAmount': 1000,
    'walletAddress': 'bc1q...'
}

response = requests.post(
    f'{BASE_URL}/orders',
    headers={
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
    },
    json=order_data
)
order = response.json()
print(order)`}</code>
                    </pre>
                  </div>
                </div>

                {/* cURL Example */}
                <div>
                  <h4 className="font-semibold mb-3">cURL</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
                      <code>{`# Get exchange rates
curl -X GET https://api.apricode.exchange/v1/rates \\
  -H "X-API-Key: your_api_key_here"

# Create an order
curl -X POST https://api.apricode.exchange/v1/orders \\
  -H "X-API-Key: your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "currencyCode": "BTC",
    "fiatCurrencyCode": "EUR",
    "fiatAmount": 1000,
    "walletAddress": "bc1q..."
  }'`}</code>
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
