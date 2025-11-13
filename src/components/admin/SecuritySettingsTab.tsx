/**
 * Security Settings Tab Component
 * 
 * Manages admin authentication security settings (Password + TOTP feature flag)
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Shield, AlertCircle, Info, Loader2 } from 'lucide-react';

const ALL_ROLES = ['ADMIN', 'COMPLIANCE', 'TREASURY_APPROVER', 'FINANCE', 'SUPPORT', 'READ_ONLY'];

export function SecuritySettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordAuthEnabled, setPasswordAuthEnabled] = useState(false);
  const [allowedRoles, setAllowedRoles] = useState<string[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      
      if (data.success) {
        setPasswordAuthEnabled(data.settings.adminPasswordAuthEnabled === true);
        
        // Parse allowed roles
        const roles = data.settings.adminPasswordAuthForRoles;
        if (Array.isArray(roles)) {
          setAllowedRoles(roles);
        } else if (typeof roles === 'string') {
          try {
            setAllowedRoles(JSON.parse(roles));
          } catch {
            setAllowedRoles([]);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load security settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Save both settings
      const updates = [
        {
          key: 'adminPasswordAuthEnabled',
          value: passwordAuthEnabled.toString()
        },
        {
          key: 'adminPasswordAuthForRoles',
          value: JSON.stringify(allowedRoles)
        }
      ];

      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Security settings saved successfully');
        
        // Refresh cache by calling a dummy endpoint or just notify
        console.log('✅ Security settings updated, cache will refresh automatically');
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save security settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleToggle = (role: string, checked: boolean) => {
    if (checked) {
      setAllowedRoles([...allowedRoles, role]);
    } else {
      setAllowedRoles(allowedRoles.filter(r => r !== role));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Authentication Security
          </CardTitle>
          <CardDescription>
            Configure authentication methods for administrators
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Feature Flag */}
          <div className="space-y-4 p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <Label htmlFor="adminPasswordAuthEnabled" className="text-base font-semibold">
                  Allow Password + TOTP Authentication
                </Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, administrators can use password + authenticator app instead of Passkey (biometric/security key).
                </p>
                
                <Alert className="mt-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Security Notice</AlertTitle>
                  <AlertDescription className="text-xs space-y-1">
                    <p><strong>Passkey (biometric/security key)</strong> provides the highest security and is phishing-resistant.</p>
                    <p><strong>Password + TOTP</strong> is more convenient but slightly less secure.</p>
                    <p className="text-amber-600 dark:text-amber-400 font-semibold">
                      <strong>SUPER_ADMIN</strong> always requires Passkey regardless of this setting.
                    </p>
                  </AlertDescription>
                </Alert>
              </div>
              
              <Switch
                id="adminPasswordAuthEnabled"
                checked={passwordAuthEnabled}
                onCheckedChange={setPasswordAuthEnabled}
                disabled={saving}
              />
            </div>

            {/* Allowed Roles (показать только если feature включен) */}
            {passwordAuthEnabled && (
              <div className="space-y-3 pl-4 border-l-2 border-amber-500/50">
                <Label className="text-sm font-medium">
                  Allowed Roles
                </Label>
                <p className="text-xs text-muted-foreground">
                  Select which admin roles can use Password + TOTP:
                </p>
                <div className="space-y-2">
                  {ALL_ROLES.map(role => (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role}`}
                        checked={allowedRoles.includes(role)}
                        onCheckedChange={(checked) => 
                          handleRoleToggle(role, checked as boolean)
                        }
                        disabled={saving}
                      />
                      <Label 
                        htmlFor={`role-${role}`} 
                        className="text-sm font-normal cursor-pointer"
                      >
                        {role}
                      </Label>
                    </div>
                  ))}
                </div>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>SUPER_ADMIN</strong> is excluded from this list and always requires Passkey for maximum security.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="w-full sm:w-auto"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Save Security Settings
                </>
              )}
            </Button>
          </div>

          {/* Info about current status */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Current Status</AlertTitle>
            <AlertDescription className="text-xs space-y-1">
              <p>
                <strong>Password + TOTP:</strong> {passwordAuthEnabled ? 'Enabled' : 'Disabled'}
              </p>
              {passwordAuthEnabled && (
                <p>
                  <strong>Allowed for:</strong> {allowedRoles.length > 0 ? allowedRoles.join(', ') : 'None'}
                </p>
              )}
              <p className="mt-2 text-muted-foreground">
                Changes take effect within 5 minutes (cache refresh time).
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

