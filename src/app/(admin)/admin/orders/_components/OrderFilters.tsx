/**
 * Order Filters Component
 * Advanced filtering for orders list
 */

'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';

export interface OrderFiltersState {
  search: string;
  status: string;
  currencyCode: string;
  fiatCurrencyCode: string;
  hasPayIn: string;
  hasPayOut: string;
  dateFrom: string;
  dateTo: string;
}

interface OrderFiltersProps {
  filters: OrderFiltersState;
  onFilterChange: (key: keyof OrderFiltersState, value: string) => void;
  onReset: () => void;
}

export function OrderFilters({ filters, onFilterChange, onReset }: OrderFiltersProps): JSX.Element {
  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all').length;

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {/* Search */}
      <div className="relative w-[250px] flex-shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by reference, email..."
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          className="pl-10 h-9"
        />
      </div>

      {/* Status Filter */}
      <Select
        value={filters.status || 'all'}
        onValueChange={(value) => onFilterChange('status', value === 'all' ? '' : value)}
      >
        <SelectTrigger className="w-[140px] h-9 flex-shrink-0">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="PENDING">Pending</SelectItem>
          <SelectItem value="PAYMENT_RECEIVED">Payment Received</SelectItem>
          <SelectItem value="PROCESSING">Processing</SelectItem>
          <SelectItem value="COMPLETED">Completed</SelectItem>
          <SelectItem value="CANCELLED">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      {/* Crypto Currency */}
      <Select
        value={filters.currencyCode || 'all'}
        onValueChange={(value) => onFilterChange('currencyCode', value === 'all' ? '' : value)}
      >
        <SelectTrigger className="w-[120px] h-9 flex-shrink-0">
          <SelectValue placeholder="All Crypto" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Crypto</SelectItem>
          <SelectItem value="BTC">BTC</SelectItem>
          <SelectItem value="ETH">ETH</SelectItem>
          <SelectItem value="USDT">USDT</SelectItem>
          <SelectItem value="USDC">USDC</SelectItem>
          <SelectItem value="SOL">SOL</SelectItem>
        </SelectContent>
      </Select>

      {/* Fiat Currency */}
      <Select
        value={filters.fiatCurrencyCode || 'all'}
        onValueChange={(value) => onFilterChange('fiatCurrencyCode', value === 'all' ? '' : value)}
      >
        <SelectTrigger className="w-[110px] h-9 flex-shrink-0">
          <SelectValue placeholder="All Fiat" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Fiat</SelectItem>
          <SelectItem value="EUR">EUR</SelectItem>
          <SelectItem value="PLN">PLN</SelectItem>
        </SelectContent>
      </Select>

      {/* Has PayIn */}
      <Select
        value={filters.hasPayIn || 'all'}
        onValueChange={(value) => onFilterChange('hasPayIn', value === 'all' ? '' : value)}
      >
        <SelectTrigger className="w-[120px] h-9 flex-shrink-0">
          <SelectValue placeholder="PayIn" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All PayIn</SelectItem>
          <SelectItem value="true">Has PayIn</SelectItem>
          <SelectItem value="false">No PayIn</SelectItem>
        </SelectContent>
      </Select>

      {/* Has PayOut */}
      <Select
        value={filters.hasPayOut || 'all'}
        onValueChange={(value) => onFilterChange('hasPayOut', value === 'all' ? '' : value)}
      >
        <SelectTrigger className="w-[130px] h-9 flex-shrink-0">
          <SelectValue placeholder="PayOut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All PayOut</SelectItem>
          <SelectItem value="true">Has PayOut</SelectItem>
          <SelectItem value="false">No PayOut</SelectItem>
        </SelectContent>
      </Select>

      {/* Active Filters Badge & Reset */}
      {activeFilterCount > 0 && (
        <>
          <Badge variant="secondary" className="h-9 px-3 flex-shrink-0">
            {activeFilterCount}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-9 px-3 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}

