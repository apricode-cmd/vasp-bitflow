/**
 * useOrderFilters Hook
 * 
 * Custom hook for order filters state management with:
 * - Type-safe filter updates
 * - Reset functionality
 * - URL sync (optional)
 */

import { useState, useCallback } from 'react';
import type { DateRange } from 'react-day-picker';

export interface OrderFilters {
  status: string;
  search: string;
  dateRange?: DateRange;
  currencyCode?: string;
  fiatCurrencyCode?: string;
  hasPayIn?: boolean;
  hasPayOut?: boolean;
  page?: number;
  limit?: number;
}

const DEFAULT_FILTERS: OrderFilters = {
  status: 'all',
  search: '',
  dateRange: undefined,
  currencyCode: undefined,
  fiatCurrencyCode: undefined,
  hasPayIn: undefined,
  hasPayOut: undefined,
  page: 1,
  limit: 20
};

export interface UseOrderFiltersReturn {
  filters: OrderFilters;
  setFilter: <K extends keyof OrderFilters>(key: K, value: OrderFilters[K]) => void;
  setFilters: (filters: Partial<OrderFilters>) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
}

export function useOrderFilters(initialFilters?: Partial<OrderFilters>): UseOrderFiltersReturn {
  const [filters, setFiltersState] = useState<OrderFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters
  });

  // Update single filter
  const setFilter = useCallback(<K extends keyof OrderFilters>(
    key: K,
    value: OrderFilters[K]
  ) => {
    setFiltersState(prev => {
      const newFilters = {
        ...prev,
        [key]: value
      };
      
      // Reset to page 1 when any filter changes (except page and limit)
      if (key !== 'page' && key !== 'limit') {
        newFilters.page = 1;
      }
      
      return newFilters;
    });
  }, []);

  // Update multiple filters at once
  const setFilters = useCallback((newFilters: Partial<OrderFilters>) => {
    setFiltersState(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  // Reset all filters to default
  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  // Check if any non-default filters are active
  const hasActiveFilters = 
    filters.status !== DEFAULT_FILTERS.status ||
    filters.search !== DEFAULT_FILTERS.search ||
    filters.dateRange !== undefined ||
    filters.currencyCode !== undefined ||
    filters.fiatCurrencyCode !== undefined ||
    filters.hasPayIn !== undefined ||
    filters.hasPayOut !== undefined;

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    hasActiveFilters
  };
}

