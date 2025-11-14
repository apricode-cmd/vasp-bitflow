/**
 * KYC Advanced Filters Component
 * 
 * Provides comprehensive filtering options for KYC sessions
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  CalendarIcon, 
  FilterX, 
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface KycFiltersState {
  country?: string;
  provider?: string;
  dateFrom?: Date;
  dateTo?: Date;
  pepStatus?: string;
}

interface KycFiltersProps {
  filters: KycFiltersState;
  onFiltersChange: (filters: KycFiltersState) => void;
  onReset: () => void;
  availableCountries?: string[];
  availableProviders?: Array<{ value: string; label: string }>;
}

export function KycFilters({
  filters,
  onFiltersChange,
  onReset,
  availableCountries = [],
  availableProviders = [],
}: KycFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Count active filters
  useEffect(() => {
    let count = 0;
    if (filters.country) count++;
    if (filters.provider) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.pepStatus) count++;
    setActiveFiltersCount(count);
  }, [filters]);

  const handleFilterChange = (key: keyof KycFiltersState, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' ? undefined : value,
    });
  };

  const handleReset = () => {
    onReset();
    setIsOpen(false);
  };

  return (
    <Card className="border-2">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-semibold">Advanced Filters</h3>
              <p className="text-sm text-muted-foreground">
                Filter KYC sessions by multiple criteria
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <>
                <Badge variant="secondary" className="font-semibold">
                  {activeFiltersCount} active
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-8"
                >
                  <FilterX className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </>
            )}
            
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                {isOpen ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Hide
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent>
          <div className="border-t p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Country Filter */}
              <div className="space-y-2">
                <Label htmlFor="country-filter" className="text-sm font-medium">
                  Country
                </Label>
                <Select
                  value={filters.country || 'all'}
                  onValueChange={(value) => handleFilterChange('country', value)}
                >
                  <SelectTrigger id="country-filter">
                    <SelectValue placeholder="All countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All countries</SelectItem>
                    {availableCountries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Provider Filter */}
              <div className="space-y-2">
                <Label htmlFor="provider-filter" className="text-sm font-medium">
                  KYC Provider
                </Label>
                <Select
                  value={filters.provider || 'all'}
                  onValueChange={(value) => handleFilterChange('provider', value)}
                >
                  <SelectTrigger id="provider-filter">
                    <SelectValue placeholder="All providers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All providers</SelectItem>
                    {availableProviders.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* PEP Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="pep-filter" className="text-sm font-medium">
                  PEP Status
                </Label>
                <Select
                  value={filters.pepStatus || 'all'}
                  onValueChange={(value) => handleFilterChange('pepStatus', value)}
                >
                  <SelectTrigger id="pep-filter">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="yes">PEP (Yes)</SelectItem>
                    <SelectItem value="no">Not PEP (No)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date From Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Submitted From
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !filters.dateFrom && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateFrom ? (
                        format(filters.dateFrom, 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => handleFilterChange('dateFrom', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Submitted To
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !filters.dateTo && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateTo ? (
                        format(filters.dateTo, 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => handleFilterChange('dateTo', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Active Filters Summary */}
            {activeFiltersCount > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  {filters.country && (
                    <Badge variant="secondary" className="gap-1">
                      Country: {filters.country}
                      <button
                        onClick={() => handleFilterChange('country', undefined)}
                        className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {filters.provider && (
                    <Badge variant="secondary" className="gap-1">
                      Provider: {filters.provider.toUpperCase()}
                      <button
                        onClick={() => handleFilterChange('provider', undefined)}
                        className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {filters.pepStatus && (
                    <Badge variant="secondary" className="gap-1">
                      PEP: {filters.pepStatus === 'yes' ? 'Yes' : 'No'}
                      <button
                        onClick={() => handleFilterChange('pepStatus', undefined)}
                        className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {filters.dateFrom && (
                    <Badge variant="secondary" className="gap-1">
                      From: {format(filters.dateFrom, 'PP')}
                      <button
                        onClick={() => handleFilterChange('dateFrom', undefined)}
                        className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {filters.dateTo && (
                    <Badge variant="secondary" className="gap-1">
                      To: {format(filters.dateTo, 'PP')}
                      <button
                        onClick={() => handleFilterChange('dateTo', undefined)}
                        className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

