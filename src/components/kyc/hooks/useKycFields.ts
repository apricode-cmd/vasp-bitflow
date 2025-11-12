/**
 * Hook for fetching and managing KYC form fields
 */
'use client';

import { useState, useEffect } from 'react';
import { KycField } from '@/lib/kyc/config';

interface UseKycFieldsReturn {
  fields: KycField[];
  grouped: Record<string, KycField[]>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useKycFields(): UseKycFieldsReturn {
  const [fields, setFields] = useState<KycField[]>([]);
  const [grouped, setGrouped] = useState<Record<string, KycField[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFields = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/kyc/form-fields');
      
      if (!response.ok) {
        throw new Error('Failed to fetch KYC fields');
      }

      const data = await response.json();
      
      // Filter only enabled fields
      const enabledFields = (data.fields || []).filter((f: KycField) => f.isEnabled);
      
      // Group fields by category
      const groupedFields = enabledFields.reduce((acc: Record<string, KycField[]>, field: KycField) => {
        if (!acc[field.category]) {
          acc[field.category] = [];
        }
        acc[field.category].push(field);
        return acc;
      }, {});

      // Sort fields within each category by priority
      Object.keys(groupedFields).forEach(category => {
        groupedFields[category].sort((a, b) => a.priority - b.priority);
      });

      setFields(enabledFields);
      setGrouped(groupedFields);
    } catch (err) {
      console.error('Error fetching KYC fields:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  return {
    fields,
    grouped,
    loading,
    error,
    refetch: fetchFields
  };
}

