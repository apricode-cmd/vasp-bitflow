/**
 * Admin Settings Page V2
 * 
 * Comprehensive system settings with categories
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Setting {
  key: string;
  value: string;
  type: string;
  category: string;
  description: string | null;
  isPublic: boolean;
}

export default function SettingsV2Page(): JSX.Element {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [grouped, setGrouped] = useState<Record<string, Setting[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('general');
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const categories = [
    { id: 'general', label: 'General' },
    { id: 'trading', label: 'Trading' },
    { id: 'kyc', label: 'KYC' },
    { id: 'payment', label: 'Payment' },
    { id: 'email', label: 'Email' }
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings');
      const data = await response.json();

      if (data.success) {
        setSettings(data.data.settings);
        setGrouped(data.data.grouped);

        // Initialize edit values
        const initialValues: Record<string, string> = {};
        data.data.settings.forEach((s: Setting) => {
          initialValues[s.key] = s.value;
        });
        setEditValues(initialValues);
      } else {
        toast.error('Failed to fetch settings');
      }
    } catch (error) {
      console.error('Fetch settings error:', error);
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string): Promise<void> => {
    try {
      const response = await fetch(`/api/admin/settings/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: editValues[key] })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Setting updated');
        await fetchSettings();
      } else {
        toast.error(data.error || 'Failed to update setting');
      }
    } catch (error) {
      console.error('Update setting error:', error);
      toast.error('Failed to update setting');
    }
  };

  const saveAllInCategory = async (): Promise<void> => {
    try {
      const categorySettings = grouped[activeCategory] || [];
      const updates = categorySettings.map(s => ({
        key: s.key,
        value: editValues[s.key]
      }));

      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Settings updated');
        await fetchSettings();
      } else {
        toast.error(data.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Update settings error:', error);
      toast.error('Failed to update settings');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading settings...</div>
      </div>
    );
  }

  const currentSettings = grouped[activeCategory] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground">Configure platform parameters</p>
        </div>
        <Button onClick={saveAllInCategory}>
          Save {activeCategory} Settings
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Settings Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {currentSettings.map((setting) => (
          <Card key={setting.key}>
            <CardHeader>
              <CardTitle className="text-lg">{setting.key.replace(/_/g, ' ').toUpperCase()}</CardTitle>
              {setting.description && (
                <CardDescription>{setting.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Value</label>
                <Input
                  type={setting.type === 'NUMBER' ? 'number' : 
                        setting.type === 'BOOLEAN' ? 'checkbox' : 
                        'text'}
                  value={editValues[setting.key] || ''}
                  onChange={(e) => setEditValues({
                    ...editValues,
                    [setting.key]: e.target.value
                  })}
                />
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Type: {setting.type}</span>
                <span>Public: {setting.isPublic ? 'Yes' : 'No'}</span>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => updateSetting(setting.key)}
                className="w-full"
              >
                Update
              </Button>
            </CardContent>
          </Card>
        ))}

        {currentSettings.length === 0 && (
          <div className="col-span-2 text-center py-12 text-muted-foreground">
            No settings in this category
          </div>
        )}
      </div>
    </div>
  );
}





