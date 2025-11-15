/**
 * WalletFilters Component
 * 
 * Advanced filtering for user wallets
 */

'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Search } from 'lucide-react';

interface WalletFiltersProps {
  filters: {
    search: string;
    currencyCode: string;
    blockchainCode: string;
    isVerified: string;
    isDefault: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onReset: () => void;
  currencies: Array<{ code: string; name: string; symbol: string }>;
  blockchains: Array<{ code: string; name: string }>;
}

export function WalletFilters({
  filters,
  onFilterChange,
  onReset,
  currencies,
  blockchains
}: WalletFiltersProps): JSX.Element {
  const activeFilterCount = Object.values(filters).filter(v => v !== '').length;

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {/* Search */}
      <div className="relative w-[200px] flex-shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by address, email..."
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          className="pl-10 h-9"
        />
      </div>

      {/* Currency Filter */}
      <Select
        value={filters.currencyCode || 'all'}
        onValueChange={(value) => onFilterChange('currencyCode', value === 'all' ? '' : value)}
      >
        <SelectTrigger className="w-[120px] h-9 flex-shrink-0">
          <SelectValue placeholder="All..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Currencies</SelectItem>
          {currencies.map((currency) => (
            <SelectItem key={currency.code} value={currency.code}>
              {currency.symbol} {currency.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Blockchain Filter */}
      <Select
        value={filters.blockchainCode || 'all'}
        onValueChange={(value) => onFilterChange('blockchainCode', value === 'all' ? '' : value)}
      >
        <SelectTrigger className="w-[120px] h-9 flex-shrink-0">
          <SelectValue placeholder="All Networks" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Networks</SelectItem>
          {blockchains.map((blockchain) => (
            <SelectItem key={blockchain.code} value={blockchain.code}>
              {blockchain.code} - {blockchain.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Verified Filter */}
      <Select
        value={filters.isVerified || 'all'}
        onValueChange={(value) => onFilterChange('isVerified', value === 'all' ? '' : value)}
      >
        <SelectTrigger className="w-[130px] h-9 flex-shrink-0">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="true">Verified</SelectItem>
          <SelectItem value="false">Unverified</SelectItem>
        </SelectContent>
      </Select>

      {/* Default Filter */}
      <Select
        value={filters.isDefault || 'all'}
        onValueChange={(value) => onFilterChange('isDefault', value === 'all' ? '' : value)}
      >
        <SelectTrigger className="w-[130px] h-9 flex-shrink-0">
          <SelectValue placeholder="All Wallets" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Wallets</SelectItem>
          <SelectItem value="true">Default Only</SelectItem>
          <SelectItem value="false">Non-Default</SelectItem>
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

