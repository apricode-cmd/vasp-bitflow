/**
 * useOrders Hook
 * 
 * Custom hook for orders data fetching with:
 * - Automatic refetching on filter changes
 * - Loading & error states
 * - Light API endpoint for performance
 * - Proper error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { OrderStatus } from '@prisma/client';
import type { DateRange } from 'react-day-picker';

export interface Order {
  id: string;
  paymentReference: string;
  status: OrderStatus;
  cryptoAmount: number;
  currencyCode: string;
  fiatAmount: number;
  fiatCurrencyCode: string;
  totalFiat: number;
  rate: number;
  feePercent: number;
  walletAddress: string;
  blockchainCode?: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
    } | null;
  };
  payIn?: {
    id: string;
    status: string;
  } | null;
  payOut?: {
    id: string;
    status: string;
  } | null;
}

export interface OrderFilters {
  status?: string;
  search?: string;
  dateRange?: DateRange;
  currencyCode?: string;
  fiatCurrencyCode?: string;
  hasPayIn?: boolean;
  hasPayOut?: boolean;
}

export interface UseOrdersReturn {
  orders: Order[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  total: number;
  page: number;
  totalPages: number;
}

export function useOrders(filters: OrderFilters = {}): UseOrdersReturn {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      // Status filter
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }

      // Search filter
      if (filters.search) {
        params.append('search', filters.search);
      }

      // Date range filter
      if (filters.dateRange?.from) {
        params.append('from', filters.dateRange.from.toISOString());
      }
      if (filters.dateRange?.to) {
        params.append('to', filters.dateRange.to.toISOString());
      }

      // Currency filters
      if (filters.currencyCode) {
        params.append('currencyCode', filters.currencyCode);
      }
      if (filters.fiatCurrencyCode) {
        params.append('fiatCurrencyCode', filters.fiatCurrencyCode);
      }

      // PayIn/PayOut filters
      if (filters.hasPayIn !== undefined) {
        params.append('hasPayIn', filters.hasPayIn.toString());
      }
      if (filters.hasPayOut !== undefined) {
        params.append('hasPayOut', filters.hasPayOut.toString());
      }

      // Use light endpoint for performance (70% less data)
      const response = await fetch(`/api/admin/orders/light?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.orders) {
        setOrders(data.orders);
        setTotal(data.total || 0);
        setPage(data.page || 1);
        setTotalPages(data.totalPages || 1);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch orders');
      setError(error);
      console.error('[useOrders] Error:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [
    filters.status,
    filters.search,
    filters.dateRange,
    filters.currencyCode,
    filters.fiatCurrencyCode,
    filters.hasPayIn,
    filters.hasPayOut
  ]);

  // Fetch on mount and filter changes
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
    total,
    page,
    totalPages
  };
}

