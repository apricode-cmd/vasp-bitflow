/**
 * KYC Form Data Accordion
 * 
 * Displays KYC form data organized by categories with Accordion
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  User, Phone, MapPin, FileText, Briefcase, Scale,
  Target, TrendingUp, Activity, CheckCircle, XCircle, Search
} from 'lucide-react';

interface KycFormDataDisplayProps {
  formData: Array<{
    id: string;
    fieldName: string;
    fieldValue: string;
  }>;
}

// Helper: Group formData by category
const groupFormDataByCategory = (formData: Array<{ fieldName: string; fieldValue: string }>) => {
  const categories: Record<string, Array<{ fieldName: string; fieldValue: string; label: string }>> = {
    personal: [],
    contact: [],
    address: [],
    documents: [],
    employment: [],
    pep_sanctions: [],
    purpose: [],
    funds: [],
    activity: [],
    consents: [],
    other: []
  };

  formData.forEach(item => {
    const fieldName = item.fieldName.toLowerCase();
    let category = 'other';

    if (['first_name', 'last_name', 'date_of_birth', 'place_of_birth', 'nationality'].includes(fieldName)) {
      category = 'personal';
    } else if (['phone', 'phone_country', 'email'].includes(fieldName)) {
      category = 'contact';
    } else if (fieldName.startsWith('address_')) {
      category = 'address';
    } else if (fieldName.startsWith('id_') || fieldName.includes('document')) {
      category = 'documents';
    } else if (fieldName.startsWith('employment') || fieldName.includes('employer') || fieldName.includes('occupation') || fieldName.includes('income') || fieldName.includes('biz_') || fieldName.includes('student') || fieldName.includes('industry') || fieldName === 'job_title' || fieldName === 'tax_or_reg_number' || fieldName === 'institution_name' || fieldName === 'revenue_band_annual' || fieldName === 'other_employment_note') {
      category = 'employment';
    } else if (fieldName.startsWith('pep_') || fieldName.includes('sanction') || fieldName === 'relationship_to_pep') {
      category = 'pep_sanctions';
    } else if (fieldName.startsWith('purpose')) {
      category = 'purpose';
    } else if (fieldName.includes('source') || fieldName.includes('funds') || fieldName.includes('wealth') || fieldName === 'additional_sources' || fieldName === 'primary_source_of_funds') {
      category = 'funds';
    } else if (fieldName.startsWith('expected_') || fieldName.startsWith('dest_')) {
      category = 'activity';
    } else if (fieldName.startsWith('consent_')) {
      category = 'consents';
    }

    const label = item.fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    categories[category].push({
      ...item,
      label
    });
  });

  // Remove empty categories
  Object.keys(categories).forEach(key => {
    if (categories[key].length === 0) {
      delete categories[key];
    }
  });

  return categories;
};

// Helper: Get category info
const getCategoryInfo = (category: string) => {
  const categoryMap: Record<string, { icon: any; name: string; description: string; color: string }> = {
    personal: { icon: User, name: 'Personal Information', description: 'Basic identity details', color: 'text-blue-600' },
    contact: { icon: Phone, name: 'Contact Information', description: 'Email and phone', color: 'text-green-600' },
    address: { icon: MapPin, name: 'Residential Address', description: 'Physical address details', color: 'text-purple-600' },
    documents: { icon: FileText, name: 'Identity Documents', description: 'ID, passport, etc.', color: 'text-orange-600' },
    employment: { icon: Briefcase, name: 'Employment & Income', description: 'Work status and income', color: 'text-cyan-600' },
    pep_sanctions: { icon: Scale, name: 'PEP & Sanctions', description: 'Political exposure and screening', color: 'text-red-600' },
    purpose: { icon: Target, name: 'Purpose of Account', description: 'Intended use', color: 'text-indigo-600' },
    funds: { icon: TrendingUp, name: 'Source of Funds', description: 'Origin of money', color: 'text-emerald-600' },
    activity: { icon: Activity, name: 'Expected Activity', description: 'Transaction patterns', color: 'text-pink-600' },
    consents: { icon: CheckCircle, name: 'Consents & Compliance', description: 'User agreements', color: 'text-teal-600' },
    other: { icon: FileText, name: 'Other Information', description: 'Additional data', color: 'text-gray-600' }
  };

  return categoryMap[category] || categoryMap.other;
};

// Format field value for display
const formatFieldValue = (value: string): React.ReactNode => {
  if (!value || value === 'null' || value === 'undefined') {
    return <span className="text-muted-foreground italic">Not provided</span>;
  }

  // Check if it's a boolean
  if (value === 'true' || value === 'false') {
    return value === 'true' ? (
      <CheckCircle className="h-4 w-4 text-green-600 inline" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600 inline" />
    );
  }

  // Check if it's a JSON array
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return (
        <div className="flex flex-wrap gap-1">
          {parsed.map((item: string, idx: number) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {item.replace(/_/g, ' ')}
            </Badge>
          ))}
        </div>
      );
    }
  } catch {
    // Not JSON, continue
  }

  // Long text (textarea)
  if (value.length > 100) {
    return (
      <div className="text-sm bg-muted p-3 rounded-md max-w-full break-words whitespace-pre-wrap">
        {value}
      </div>
    );
  }

  // Regular text
  return <span className="font-medium">{value}</span>;
};

export function KycFormDataDisplay({ formData }: KycFormDataDisplayProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!formData || formData.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground text-center">
          No form data available
        </p>
      </Card>
    );
  }

  const groupedData = groupFormDataByCategory(formData);
  
  // Filter categories and fields based on search
  const filteredGroupedData: typeof groupedData = {};
  Object.keys(groupedData).forEach(categoryKey => {
    const fields = groupedData[categoryKey];
    const filteredFields = fields.filter(field => 
      field.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.fieldName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.fieldValue.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (filteredFields.length > 0) {
      filteredGroupedData[categoryKey] = filteredFields;
    }
  });

  const categoryKeys = Object.keys(filteredGroupedData);
  const totalFields = Object.values(filteredGroupedData).reduce((acc, fields) => acc + fields.length, 0);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search fields by name or value..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {searchQuery ? `${totalFields} matching fields in ${categoryKeys.length} categories` : `${formData.length} fields in ${categoryKeys.length} categories`}
        </span>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-primary hover:underline text-xs"
          >
            Clear search
          </button>
        )}
      </div>

      {categoryKeys.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground text-center">
            No fields match your search
          </p>
        </Card>
      ) : (
        <Accordion type="multiple" className="w-full space-y-2" defaultValue={categoryKeys.slice(0, 3)}>
          {categoryKeys.map(categoryKey => {
            const categoryInfo = getCategoryInfo(categoryKey);
            const CategoryIcon = categoryInfo.icon;
            const fields = filteredGroupedData[categoryKey];

            return (
              <AccordionItem 
                key={categoryKey} 
                value={categoryKey}
                className="border rounded-lg px-4 bg-card"
              >
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`rounded-md bg-muted p-2 ${categoryInfo.color}`}>
                      <CategoryIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold">{categoryInfo.name}</div>
                      <div className="text-xs text-muted-foreground font-normal">
                        {categoryInfo.description} • {fields.length} fields
                        {searchQuery && ` (filtered)`}
                      </div>
                    </div>
                    <Badge variant="secondary" className="ml-auto">
                      {fields.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fields.map((field) => (
                      <div key={field.fieldName} className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          {field.label}
                        </p>
                        <div className="text-sm">
                          {formatFieldValue(field.fieldValue)}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}

