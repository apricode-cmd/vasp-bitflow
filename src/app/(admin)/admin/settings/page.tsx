/**
 * System Settings Page
 * 
 * Comprehensive system configuration: Brand, SEO, Legal, System
 */

'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LegalDocumentEditor } from '@/components/admin/LegalDocumentEditor';
import { 
  ColorPicker,
  ColorPickerSelection,
  ColorPickerHue,
  ColorPickerFormat,
  ColorPickerOutput,
  ColorPickerEyeDropper
} from '@/components/ui/shadcn-io/color-picker';
import { toast } from 'sonner';
import { 
  Building2, Globe, FileText, Settings as SettingsIcon, 
  Save, Loader2, AlertCircle, Sparkles, Mail, Shield, Palette
} from 'lucide-react';
import Color from 'color';

interface SystemSettings {
  // Brand
  brandName: string;
  brandTagline: string;
  brandLogo: string;
  primaryColor: string; // Brand primary color
  supportEmail: string;
  supportPhone: string;
  
  // SEO
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ogImage: string;
  
  // System
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  kycRequired: boolean;
  emailNotifications: boolean;
  
  // Platform
  defaultFeePercent: number;
  minOrderAmount: number;
  maxOrderAmount: number;
  orderExpirationHours: number;
}

export default function SettingsPage(): JSX.Element {
  const [settings, setSettings] = useState<Partial<SystemSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('brand');
  const [previewColor, setPreviewColor] = useState<string>('#06b6d4'); // Default cyan like in screenshot
  const [mounted, setMounted] = useState(false);

  // Mark as mounted to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    
    // Load saved color from localStorage on mount
    const savedColor = localStorage.getItem('brand-primary-color');
    if (savedColor) {
      setPreviewColor(savedColor);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, []);

  // Apply theme color in real-time
  useEffect(() => {
    if (mounted && previewColor) {
      applyThemeColor(previewColor);
      // Save to localStorage for persistence
      localStorage.setItem('brand-primary-color', previewColor);
    }
  }, [previewColor, mounted]);

  const applyThemeColor = (hexColor: string) => {
    try {
      const color = Color(hexColor);
      
      // Get HSL values using correct Color.js methods
      const hue = Math.round(color.hue());
      const saturation = Math.round(color.saturationl());
      const lightness = Math.round(color.lightness());
      
      // Apply to both light and dark theme
      const root = document.documentElement;
      root.style.setProperty('--primary', `${hue} ${saturation}% ${lightness}%`);
      
      // Log for debugging
      console.log('Applied theme color:', {
        hex: hexColor,
        hsl: `${hue} ${saturation}% ${lightness}%`
      });
    } catch (error) {
      console.error('Invalid color:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings || {});
        // Set preview color from settings
        if (data.settings?.primaryColor) {
          setPreviewColor(data.settings.primaryColor);
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Add preview color to settings before saving
      const settingsToSave = {
        ...settings,
        primaryColor: previewColor
      };

      // Convert settings object to array format expected by API
      const settingsArray = Object.entries(settingsToSave).map(([key, value]) => ({
        key,
        value: String(value)
      }));

      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsArray)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Settings saved successfully');
        await fetchSettings();
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your platform branding, SEO, legal documents, and system preferences
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gradient-primary">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save All Changes
            </>
          )}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="brand">
            <Building2 className="h-4 w-4 mr-2" />
            Brand
          </TabsTrigger>
          <TabsTrigger value="seo">
            <Globe className="h-4 w-4 mr-2" />
            SEO
          </TabsTrigger>
          <TabsTrigger value="legal">
            <FileText className="h-4 w-4 mr-2" />
            Legal
          </TabsTrigger>
          <TabsTrigger value="system">
            <SettingsIcon className="h-4 w-4 mr-2" />
            System
          </TabsTrigger>
        </TabsList>

        {/* Brand Settings */}
        <TabsContent value="brand" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Brand Identity
              </CardTitle>
              <CardDescription>
                Configure your platform's name, logo, and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="brandName">Platform Name</Label>
                  <Input
                    id="brandName"
                    value={settings.brandName || ''}
                    onChange={(e) => updateSetting('brandName', e.target.value)}
                    placeholder="Apricode Exchange"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brandTagline">Tagline</Label>
                  <Input
                    id="brandTagline"
                    value={settings.brandTagline || ''}
                    onChange={(e) => updateSetting('brandTagline', e.target.value)}
                    placeholder="Buy Cryptocurrency Securely"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brandLogo">Logo URL</Label>
                <Input
                  id="brandLogo"
                  value={settings.brandLogo || ''}
                  onChange={(e) => updateSetting('brandLogo', e.target.value)}
                  placeholder="https://your-cdn.com/logo.png"
                />
                <p className="text-xs text-muted-foreground">
                  Recommended size: 200x50px, PNG format with transparency
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="font-semibold">Primary Brand Color</h4>
                    <p className="text-sm text-muted-foreground">
                      Choose your brand's primary color - changes apply in real-time
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <ColorPicker
                      value={previewColor}
                      onChange={(rgba) => {
                        try {
                          const color = Color.rgb(rgba);
                          const hex = color.hex();
                          setPreviewColor(hex);
                          // Don't update settings here - only on save
                          // This prevents infinite loop
                        } catch (error) {
                          console.error('Color conversion error:', error);
                        }
                      }}
                      className="w-full"
                    >
                      <ColorPickerSelection className="h-48 w-full" />
                      <ColorPickerHue className="mt-3" />
                      <div className="mt-3 flex items-center gap-2">
                        <ColorPickerFormat className="flex-1" />
                        <ColorPickerOutput />
                        <ColorPickerEyeDropper />
                      </div>
                    </ColorPicker>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                      <span className="text-sm font-medium">Preview Color</span>
                      <div 
                        className="h-10 w-10 rounded-md border-2 shadow-sm"
                        style={{ backgroundColor: previewColor }}
                      />
                    </div>
                    
                    <Alert>
                      <Sparkles className="h-4 w-4" />
                      <AlertTitle>Live Preview Active</AlertTitle>
                      <AlertDescription>
                        Color changes are applied instantly. Click "Save All Changes" to make them permanent.
                      </AlertDescription>
                    </Alert>

                    <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                      <p className="text-sm font-medium">Current Value:</p>
                      <code className="text-xs bg-background px-2 py-1 rounded border">
                        {previewColor}
                      </code>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <h4 className="font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Contact Information
              </h4>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={settings.supportEmail || ''}
                    onChange={(e) => updateSetting('supportEmail', e.target.value)}
                    placeholder="support@apricode.io"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supportPhone">Support Phone</Label>
                  <Input
                    id="supportPhone"
                    type="tel"
                    value={settings.supportPhone || ''}
                    onChange={(e) => updateSetting('supportPhone', e.target.value)}
                    placeholder="+48 123 456 789"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO Settings */}
        <TabsContent value="seo" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                SEO Configuration
              </CardTitle>
              <CardDescription>
                Optimize your platform for search engines
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="seoTitle">Meta Title</Label>
                <Input
                  id="seoTitle"
                  value={settings.seoTitle || ''}
                  onChange={(e) => updateSetting('seoTitle', e.target.value)}
                  placeholder="Buy Cryptocurrency Securely | Apricode Exchange"
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground">
                  {(settings.seoTitle || '').length}/60 characters - Keep under 60 for best results
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seoDescription">Meta Description</Label>
                <Textarea
                  id="seoDescription"
                  value={settings.seoDescription || ''}
                  onChange={(e) => updateSetting('seoDescription', e.target.value)}
                  placeholder="Purchase Bitcoin, Ethereum, Tether, and Solana with EUR or PLN. Secure, KYC-verified cryptocurrency exchange platform."
                  rows={3}
                  maxLength={160}
                />
                <p className="text-xs text-muted-foreground">
                  {(settings.seoDescription || '').length}/160 characters - Optimal: 120-160
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seoKeywords">Keywords</Label>
                <Input
                  id="seoKeywords"
                  value={settings.seoKeywords || ''}
                  onChange={(e) => updateSetting('seoKeywords', e.target.value)}
                  placeholder="cryptocurrency, bitcoin, ethereum, buy crypto, exchange"
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated keywords for SEO
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="ogImage">Open Graph Image</Label>
                <Input
                  id="ogImage"
                  value={settings.ogImage || ''}
                  onChange={(e) => updateSetting('ogImage', e.target.value)}
                  placeholder="https://your-cdn.com/og-image.jpg"
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: 1200x630px for social media sharing
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Legal Documents */}
        <TabsContent value="legal" className="space-y-6 mt-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>Legal Compliance</AlertTitle>
            <AlertDescription>
              These documents are legally binding. Please consult with legal counsel before publishing.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="terms" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="terms">Terms of Service</TabsTrigger>
              <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
              <TabsTrigger value="aml">AML Policy</TabsTrigger>
              <TabsTrigger value="cookies">Cookie Policy</TabsTrigger>
            </TabsList>

            <TabsContent value="terms" className="mt-6">
              <LegalDocumentEditor
                documentType="terms"
                title="Terms of Service"
                description="Define the terms and conditions for using your platform"
                apiEndpoint="/api/admin/legal"
              />
            </TabsContent>

            <TabsContent value="privacy" className="mt-6">
              <LegalDocumentEditor
                documentType="privacy"
                title="Privacy Policy"
                description="Explain how you collect, use, and protect user data"
                apiEndpoint="/api/admin/legal"
              />
            </TabsContent>

            <TabsContent value="aml" className="mt-6">
              <LegalDocumentEditor
                documentType="aml"
                title="AML/KYC Policy"
                description="Anti-Money Laundering and Know Your Customer procedures"
                apiEndpoint="/api/admin/legal"
              />
            </TabsContent>

            <TabsContent value="cookies" className="mt-6">
              <LegalDocumentEditor
                documentType="cookies"
                title="Cookie Policy"
                description="Disclosure of cookie usage on your platform"
                apiEndpoint="/api/admin/legal"
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Settings</CardTitle>
              <CardDescription>
                Configure core platform functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Toggles */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Disable platform for maintenance
                    </p>
                  </div>
                  <Switch
                    checked={settings.maintenanceMode || false}
                    onCheckedChange={(val) => updateSetting('maintenanceMode', val)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>User Registration</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow new users to register
                    </p>
                  </div>
                  <Switch
                    checked={settings.registrationEnabled !== false}
                    onCheckedChange={(val) => updateSetting('registrationEnabled', val)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mandatory KYC</Label>
                    <p className="text-sm text-muted-foreground">
                      Require KYC before trading
                    </p>
                  </div>
                  <Switch
                    checked={settings.kycRequired !== false}
                    onCheckedChange={(val) => updateSetting('kycRequired', val)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send emails to users about orders
                    </p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications !== false}
                    onCheckedChange={(val) => updateSetting('emailNotifications', val)}
                  />
                </div>
              </div>

              <Separator />

              {/* Platform Limits */}
              <div>
                <h4 className="font-semibold mb-4">Platform Limits</h4>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="defaultFeePercent">Default Fee (%)</Label>
                    <Input
                      id="defaultFeePercent"
                      type="number"
                      step="0.1"
                      value={settings.defaultFeePercent || 1.5}
                      onChange={(e) => updateSetting('defaultFeePercent', parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orderExpiration">Order Expiration (hours)</Label>
                    <Input
                      id="orderExpiration"
                      type="number"
                      value={settings.orderExpirationHours || 24}
                      onChange={(e) => updateSetting('orderExpirationHours', parseInt(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minOrder">Min Order Amount (EUR)</Label>
                    <Input
                      id="minOrder"
                      type="number"
                      value={settings.minOrderAmount || 10}
                      onChange={(e) => updateSetting('minOrderAmount', parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxOrder">Max Order Amount (EUR)</Label>
                    <Input
                      id="maxOrder"
                      type="number"
                      value={settings.maxOrderAmount || 50000}
                      onChange={(e) => updateSetting('maxOrderAmount', parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              {/* Warning for Maintenance Mode */}
              {settings.maintenanceMode && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Maintenance Mode Active</AlertTitle>
                  <AlertDescription>
                    Your platform is currently in maintenance mode. Users cannot access the system.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

