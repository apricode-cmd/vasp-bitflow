/**
 * KycFormStep - Render a single step in the KYC wizard
 * Groups fields by category and renders them
 */
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KycField } from './KycField';
import { KycField as KycFieldType, KYC_CATEGORIES, getFieldsForStep, KycStep } from '@/lib/kyc/config';
import { shouldShowField } from '@/lib/kyc/conditionalLogic';
import * as Icons from 'lucide-react';

interface Props {
  step: KycStep;
  fields: KycFieldType[];
  formData: Record<string, any>;
  errors: Record<string, string>;
  onChange: (fieldName: string, value: any) => void;
}

export function KycFormStep({ step, fields, formData, errors, onChange }: Props) {
  // Get fields for this step (only enabled, sorted by priority)
  const allStepFields = getFieldsForStep(step, fields);
  
  // Filter by conditional logic
  const stepFields = allStepFields.filter(field => shouldShowField(field, formData));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Step {step.id}: {step.title}</CardTitle>
        {step.description && (
          <CardDescription>{step.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Group fields by category */}
        {step.categories.map(categoryCode => {
          const categoryFields = stepFields.filter(f => f.category === categoryCode);
          if (categoryFields.length === 0) return null;

          const category = KYC_CATEGORIES[categoryCode];
          const IconComponent = (Icons as any)[category?.icon] || Icons.FileText;

          return (
            <div key={categoryCode} className="space-y-4 pb-6 border-b last:border-0 last:pb-0">
              {/* Category Header */}
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <IconComponent className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {category?.name || categoryCode}
                  </h3>
                  {category?.description && (
                    <p className="text-sm text-muted-foreground">
                      {category.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Fields Grid - Improved Responsive */}
              <div className="grid gap-4 sm:gap-5 grid-cols-1 md:grid-cols-2">
                {categoryFields.map(field => (
                  <div 
                    key={field.id}
                    className={`${
                      field.fieldType === 'textarea' || field.fieldType === 'file' 
                        ? 'md:col-span-2' 
                        : ''
                    }`}
                  >
                    <KycField
                      field={field}
                      value={formData[field.fieldName]}
                      onChange={(value) => onChange(field.fieldName, value)}
                      error={errors[field.fieldName]}
                      formData={formData}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {stepFields.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No fields to display in this step</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

