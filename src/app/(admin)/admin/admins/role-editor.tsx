/**
 * Role Permissions Editor Component
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';

/**
 * Role Permissions Editor Component
 */
interface RolePermissionsEditorProps {
  role: any | null;
  permissions: any[];
  selectedPermissions: string[];
  onTogglePermission: (code: string) => void;
  onSave: (roleData: any) => void;
  onCancel: () => void;
}

export function RolePermissionsEditor({
  role,
  permissions,
  selectedPermissions,
  onTogglePermission,
  onSave,
  onCancel,
}: RolePermissionsEditorProps) {
  const [formData, setFormData] = useState({
    code: role?.code || '',
    name: role?.name || '',
    description: role?.description || '',
  });

  const [searchQuery, setSearchQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  // Group permissions by category
  const permissionsByCategory = permissions.reduce((acc: any, perm: any) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {});

  // Filter permissions by search query
  const filteredPermissions = searchQuery
    ? permissions.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : permissions;

  const filteredByCategory = filteredPermissions.reduce((acc: any, perm: any) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {});

  const selectAllInCategory = (category: string) => {
    const categoryPerms = permissionsByCategory[category] || [];
    const allSelected = categoryPerms.every((p: any) => 
      selectedPermissions.includes(p.code)
    );

    if (allSelected) {
      // Deselect all in category
      categoryPerms.forEach((p: any) => {
        if (selectedPermissions.includes(p.code)) {
          onTogglePermission(p.code);
        }
      });
    } else {
      // Select all in category
      categoryPerms.forEach((p: any) => {
        if (!selectedPermissions.includes(p.code)) {
          onTogglePermission(p.code);
        }
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Role Details */}
      {!role?.isSystem && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Role Code</label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                placeholder="CUSTOM_ROLE"
                required
                disabled={!!role}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Unique identifier (uppercase, underscores only)
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Role Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Custom Role"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe this role's purpose and responsibilities"
            />
          </div>
        </div>
      )}

      {/* Permissions Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Permissions ({selectedPermissions.length} selected)</h3>
            <p className="text-sm text-muted-foreground">Select permissions for this role</p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search permissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto space-y-4">
          {Object.entries(filteredByCategory).map(([category, perms]: [string, any]) => {
            const allSelected = perms.every((p: any) => 
              selectedPermissions.includes(p.code)
            );
            const someSelected = perms.some((p: any) => 
              selectedPermissions.includes(p.code)
            );

            return (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between pb-2 border-b">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected && !allSelected;
                      }}
                      onChange={() => selectAllInCategory(category)}
                      className="w-4 h-4"
                    />
                    <span className="font-semibold capitalize">{category}</span>
                    <Badge variant="outline" className="text-xs">
                      {perms.filter((p: any) => selectedPermissions.includes(p.code)).length}/{perms.length}
                    </Badge>
                  </label>
                </div>
                <div className="grid gap-2 pl-6">
                  {perms.map((perm: any) => (
                    <label
                      key={perm.code}
                      className="flex items-start gap-3 p-2 rounded hover:bg-accent/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(perm.code)}
                        onChange={() => onTogglePermission(perm.code)}
                        className="mt-1 w-4 h-4"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{perm.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{perm.code}</div>
                        {perm.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {perm.description}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {role ? 'Update Role' : 'Create Role'}
        </Button>
      </div>
    </form>
  );
}

