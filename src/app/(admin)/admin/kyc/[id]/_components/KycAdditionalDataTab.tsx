/**
 * KycAdditionalDataTab
 * 
 * Displays additional dynamic KYC form data grouped by categories
 */

'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Layers } from 'lucide-react';
import type { KycSessionDetail } from './types';

interface KycAdditionalDataTabProps {
  session: KycSessionDetail;
}

export function KycAdditionalDataTab({ session }: KycAdditionalDataTabProps): JSX.Element {
  if (!session.formData || session.formData.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">No additional form data available</p>
        </div>
      </Card>
    );
  }

  // Group fields by category (simple heuristic based on field names)
  const categorizeField = (fieldName: string): string => {
    const name = fieldName.toLowerCase();
    
    // Personal Information
    if (name.includes('first_name') || name.includes('last_name') || name.includes('date_of_birth') || 
        name.includes('nationality') || name.includes('name') || name.includes('birth')) {
      return '👤 Personal Information';
    }
    
    // Contact Details
    if (name.includes('email') || name.includes('phone') || name.includes('contact')) {
      return '📧 Contact Details';
    }
    
    // Address Information
    if (name.includes('address') || name.includes('street') || name.includes('city') || 
        name.includes('postal') || name.includes('country') && name.includes('address')) {
      return '📍 Address Information';
    }
    
    // Identity Documents
    if (name.includes('id_') || name.includes('passport') || name.includes('license') || 
        name.includes('id_scan') || name.includes('id_type') || name.includes('proof')) {
      return '🆔 Identity Documents';
    }
    
    // Employment & Financial
    if (name.includes('employment') || name.includes('occupation') || name.includes('employer') || 
        name.includes('work') || name.includes('source') || name.includes('fund') || 
        name.includes('wealth') || name.includes('income')) {
      return '💼 Employment & Financial';
    }
    
    // Consents & Compliance
    if (name.includes('consent') || name.includes('agreement') || name.includes('terms')) {
      return '✅ Consents & Compliance';
    }
    
    return '📋 Other Information';
  };

  // Group fields by category
  const groupedData = session.formData.reduce((acc, field) => {
    const category = categorizeField(field.fieldName);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(field);
    return acc;
  }, {} as Record<string, typeof session.formData>);

  const categories = Object.keys(groupedData).sort();

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Additional KYC Data
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Dynamic form fields submitted during KYC process
            </p>
          </div>
          <Badge variant="secondary">
            {session.formData.length} field{session.formData.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {categories.map((category) => (
          <div key={category} className="mb-8 last:mb-0">
            <div className="flex items-center gap-2 mb-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {category}
              </h4>
              <div className="flex-1 border-t border-border" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {groupedData[category].map((field) => {
                // Format value based on type
                let displayValue = field.fieldValue;
                
                // Handle boolean values
                if (typeof field.fieldValue === 'boolean') {
                  displayValue = field.fieldValue ? 'Yes' : 'No';
                }
                // Handle file objects
                else if (field.fieldValue === '[object Object]') {
                  displayValue = '📎 File attached';
                }
                // Handle dates
                else if (field.fieldName.includes('date') && field.fieldValue) {
                  try {
                    const date = new Date(field.fieldValue);
                    if (!isNaN(date.getTime())) {
                      displayValue = date.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      });
                    }
                  } catch (e) {
                    // Keep original value if parsing fails
                  }
                }
                // Handle empty values
                else if (!field.fieldValue || field.fieldValue === '') {
                  displayValue = 'N/A';
                }

                return (
                  <div 
                    key={field.id} 
                    className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <p className="text-sm text-muted-foreground mb-1 capitalize">
                      {field.fieldName.replace(/_/g, ' ').replace(/-/g, ' ')}
                    </p>
                    <p className="font-medium text-sm break-words">
                      {displayValue}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </Card>

      {/* Raw JSON View (for debugging) */}
      <details className="group">
        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
          View Raw JSON Data
        </summary>
        <Card className="p-4 mt-2">
          <pre className="text-xs overflow-auto max-h-96 bg-muted p-4 rounded">
            {JSON.stringify(session.formData, null, 2)}
          </pre>
        </Card>
      </details>
    </div>
  );
}

