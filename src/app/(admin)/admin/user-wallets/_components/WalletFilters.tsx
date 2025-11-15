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
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by address, email, or label..."
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Currency Filter */}
        <Select
          value={filters.currencyCode}
          onValueChange={(value) => onFilterChange('currencyCode', value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Currencies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Currencies</SelectItem>
            {currencies.map((currency) => (
              <SelectItem key={currency.code} value={currency.code}>
                {currency.symbol} {currency.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Blockchain Filter */}
        <Select
          value={filters.blockchainCode}
          onValueChange={(value) => onFilterChange('blockchainCode', value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Networks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Networks</SelectItem>
            {blockchains.map((blockchain) => (
              <SelectItem key={blockchain.code} value={blockchain.code}>
                {blockchain.code} - {blockchain.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Verified Filter */}
        <Select
          value={filters.isVerified}
          onValueChange={(value) => onFilterChange('isVerified', value)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Verification" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            <SelectItem value="true">Verified</SelectItem>
            <SelectItem value="false">Unverified</SelectItem>
          </SelectContent>
        </Select>

        {/* Default Filter */}
        <Select
          value={filters.isDefault}
          onValueChange={(value) => onFilterChange('isDefault', value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Default" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Wallets</SelectItem>
            <SelectItem value="true">Default Only</SelectItem>
            <SelectItem value="false">Non-Default</SelectItem>
          </SelectContent>
        </Select>

        {/* Active Filters Badge & Reset */}
        {activeFilterCount > 0 && (
          <>
            <Badge variant="secondary">
              {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-8"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

