/**
 * Pay In Filters Component
 * Advanced filtering for PayIn management
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Card } from '@/components/ui/card';
import { CalendarIcon, X, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

export interface PayInFilterOptions {
  currencyType?: 'FIAT' | 'CRYPTO' | 'all';
  status?: string;
  fromDate?: Date;
  toDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  currency?: string;
  paymentMethod?: string;
}

interface PayInFiltersProps {
  filters: PayInFilterOptions;
  onChange: (filters: PayInFilterOptions) => void;
  onReset: () => void;
  currencies?: string[];
  paymentMethods?: string[];
}

export function PayInFilters({
  filters,
  onChange,
  onReset,
  currencies = [],
  paymentMethods = [],
}: PayInFiltersProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  const activeFiltersCount = Object.values(filters).filter((v) => {
    if (v === 'all' || v === undefined || v === null) return false;
    return true;
  }).length;

  const handleChange = (key: keyof PayInFilterOptions, value: any): void => {
    onChange({
      ...filters,
      [key]: value === 'all' ? undefined : value,
    });
  };

  const handleReset = (): void => {
    onReset();
    setIsOpen(false);
  };

  return (
    <div className="space-y-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </CollapsibleTrigger>

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 px-2"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <CollapsibleContent className="mt-4">
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Currency Type */}
              <div className="space-y-2">
                <Label>Currency Type</Label>
                <Select
                  value={filters.currencyType || 'all'}
                  onValueChange={(value) => handleChange('currencyType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="FIAT">Fiat</SelectItem>
                    <SelectItem value="CRYPTO">Crypto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Specific Currency */}
              {currencies.length > 0 && (
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={filters.currency || 'all'}
                    onValueChange={(value) => handleChange('currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All currencies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Currencies</SelectItem>
                      {currencies.map((curr) => (
                        <SelectItem key={curr} value={curr}>
                          {curr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Payment Method */}
              {paymentMethods.length > 0 && (
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select
                    value={filters.paymentMethod || 'all'}
                    onValueChange={(value) => handleChange('paymentMethod', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All methods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Date Range */}
              <div className="space-y-2">
                <Label>From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !filters.fromDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.fromDate ? format(filters.fromDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.fromDate}
                      onSelect={(date) => handleChange('fromDate', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !filters.toDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.toDate ? format(filters.toDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.toDate}
                      onSelect={(date) => handleChange('toDate', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Amount Range */}
              <div className="space-y-2">
                <Label>Min Amount</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={filters.minAmount || ''}
                  onChange={(e) =>
                    handleChange('minAmount', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Max Amount</Label>
                <Input
                  type="number"
                  placeholder="999999.99"
                  value={filters.maxAmount || ''}
                  onChange={(e) =>
                    handleChange('maxAmount', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                />
              </div>
            </div>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

