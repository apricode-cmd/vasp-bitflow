/**
 * Category Group Section Component
 * Displays fields grouped by category with collapsible sections
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import * as Icons from 'lucide-react';
import { KYC_CATEGORIES } from '@/lib/kyc/config';

interface Field {
  id: string;
  fieldName: string;
  label: string;
  fieldType: string;
  isRequired: boolean;
  isEnabled: boolean;
  category: string;
  priority: number;
  dependsOn: string | null;
  helpText: string | null;
}

interface CategoryGroupSectionProps {
  categoryCode: string;
  fields: Field[];
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
  onFieldClick?: (field: Field) => void;
}

export function CategoryGroupSection({
  categoryCode,
  fields,
  isCollapsible = true,
  defaultCollapsed = false,
  onFieldClick
}: CategoryGroupSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  
  const category = KYC_CATEGORIES[categoryCode];
  
  if (!category) {
    return null;
  }

  const IconComponent = (Icons as any)[category.icon] || Icons.FileText;
  const enabledFields = fields.filter(f => f.isEnabled);
  const requiredFields = enabledFields.filter(f => f.isRequired);
  const conditionalFields = fields.filter(f => f.dependsOn);

  return (
    <Card className="overflow-hidden transition-all">
      <CardHeader 
        className={`${isCollapsible ? 'cursor-pointer hover:bg-muted/50' : ''} transition-colors`}
        onClick={() => isCollapsible && setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <IconComponent className="h-5 w-5" />
            </div>
            
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                {category.name}
                {isCollapsible && (
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {category.description}
              </CardDescription>
              
              {/* Stats */}
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary" className="text-xs">
                  {enabledFields.length} {enabledFields.length === 1 ? 'field' : 'fields'}
                </Badge>
                
                {requiredFields.length > 0 && (
                  <Badge variant="default" className="text-xs">
                    {requiredFields.length} required
                  </Badge>
                )}
                
                {conditionalFields.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {conditionalFields.length} conditional
                  </Badge>
                )}
                
                {fields.length !== enabledFields.length && (
                  <Badge variant="secondary" className="text-xs text-muted-foreground">
                    {fields.length - enabledFields.length} disabled
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {fields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No fields in this category
              </div>
            ) : (
              fields
                .sort((a, b) => a.priority - b.priority)
                .map((field) => (
                  <div
                    key={field.id}
                    onClick={() => onFieldClick?.(field)}
                    className={`
                      p-3 rounded-lg border transition-all
                      ${onFieldClick ? 'cursor-pointer hover:bg-muted/50 hover:border-primary/50' : ''}
                      ${!field.isEnabled ? 'opacity-50 bg-muted/30' : 'bg-background'}
                    `}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {field.label}
                          </span>
                          
                          {field.isRequired && (
                            <Badge variant="destructive" className="text-xs h-5">
                              Required
                            </Badge>
                          )}
                          
                          {!field.isEnabled && (
                            <Badge variant="secondary" className="text-xs h-5">
                              Disabled
                            </Badge>
                          )}
                          
                          {field.dependsOn && (
                            <Badge variant="outline" className="text-xs h-5">
                              Conditional
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <code className="px-1.5 py-0.5 bg-muted rounded">
                            {field.fieldName}
                          </code>
                          <span>•</span>
                          <span className="capitalize">{field.fieldType}</span>
                          {field.dependsOn && (
                            <>
                              <span>•</span>
                              <span>Depends on: {field.dependsOn}</span>
                            </>
                          )}
                        </div>
                        
                        {field.helpText && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {field.helpText}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground shrink-0">
                        Priority: {field.priority}
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

