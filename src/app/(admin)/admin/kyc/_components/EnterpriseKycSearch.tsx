/**
 * Enterprise-Level KYC Search & Filters
 * Using Command component for better UX inside Popover
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import {
  Search,
  Filter,
  X,
  Clock,
  Calendar as CalendarIcon,
  Star,
  Save,
  Bookmark,
  RotateCcw,
  ChevronDown,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { DateRange } from 'react-day-picker';

export interface EnterpriseFilters {
  search?: string;
  status?: string;
  country?: string;
  provider?: string;
  pepStatus?: string;
  riskLevel?: string;
  dateRange?: DateRange;
  quickDate?: string;
  savedFilter?: string;
}

interface Props {
  filters: EnterpriseFilters;
  onFiltersChange: (filters: EnterpriseFilters) => void;
  availableCountries: string[];
  availableProviders: Array<{ value: string; label: string }>;
}

// Quick date presets
const QUICK_DATES = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: 'last_7' },
  { label: 'Last 30 days', value: 'last_30' },
  { label: 'Last 90 days', value: 'last_90' },
  { label: 'This week', value: 'this_week' },
  { label: 'This month', value: 'this_month' },
];

// Risk levels
const RISK_LEVELS = [
  { label: 'Low', value: 'low', color: 'bg-green-500' },
  { label: 'Medium', value: 'medium', color: 'bg-yellow-500' },
  { label: 'High', value: 'high', color: 'bg-red-500' },
];

export function EnterpriseKycSearch({
  filters,
  onFiltersChange,
  availableCountries,
  availableProviders,
}: Props): JSX.Element {
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(filters.dateRange);
  const [savedFilters, setSavedFilters] = useState<Array<{ name: string; filters: EnterpriseFilters }>>([]);
  
  // Combobox states
  const [countryOpen, setCountryOpen] = useState(false);
  const [providerOpen, setProviderOpen] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.search) {
        onFiltersChange({ ...filters, search: searchValue });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  // Load saved filters from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('kyc-saved-filters');
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved filters', e);
      }
    }
  }, []);

  const handleQuickDate = (preset: string) => {
    const now = new Date();
    let range: DateRange | undefined;

    switch (preset) {
      case 'today':
        range = { from: now, to: now };
        break;
      case 'last_7':
        range = { from: subDays(now, 7), to: now };
        break;
      case 'last_30':
        range = { from: subDays(now, 30), to: now };
        break;
      case 'last_90':
        range = { from: subDays(now, 90), to: now };
        break;
      case 'this_week':
        range = { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
        break;
      case 'this_month':
        range = { from: startOfMonth(now), to: endOfMonth(now) };
        break;
    }

    setDateRange(range);
    onFiltersChange({ ...filters, dateRange: range, quickDate: preset });
  };

  const handleSaveFilter = () => {
    const name = prompt('Name this filter preset:');
    if (!name) return;

    const newSaved = [...savedFilters, { name, filters }];
    setSavedFilters(newSaved);
    localStorage.setItem('kyc-saved-filters', JSON.stringify(newSaved));
  };

  const handleLoadFilter = (saved: { name: string; filters: EnterpriseFilters }) => {
    onFiltersChange(saved.filters);
    setSearchValue(saved.filters.search || '');
    setDateRange(saved.filters.dateRange);
  };

  const handleDeleteSavedFilter = (index: number) => {
    const newSaved = savedFilters.filter((_, i) => i !== index);
    setSavedFilters(newSaved);
    localStorage.setItem('kyc-saved-filters', JSON.stringify(newSaved));
  };

  const clearAllFilters = () => {
    onFiltersChange({});
    setSearchValue('');
    setDateRange(undefined);
  };

  const activeFiltersCount = Object.keys(filters).filter(
    (key) => key !== 'search' && filters[key as keyof EnterpriseFilters]
  ).length;

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="flex gap-3 items-center">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search by name, email, verification ID, applicant ID..."
            className="pl-10 pr-10 h-11"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => {
                setSearchValue('');
                onFiltersChange({ ...filters, search: '' });
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Advanced Filters Button */}
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 h-11">
              <Filter className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFiltersCount}
                </Badge>
              )}
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[480px] p-0" align="end" side="bottom" sideOffset={8}>
            <div className="max-h-[500px] overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Advanced Filters</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-8 text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset All
                </Button>
              </div>

              <Separator />

              {/* Country Filter with Command */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Country ({availableCountries.length})
                </label>
                <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={countryOpen}
                      className="w-full justify-between"
                    >
                      {filters.country || 'All countries'}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search country..." />
                      <CommandList>
                        <CommandEmpty>No country found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            onSelect={() => {
                              onFiltersChange({ ...filters, country: undefined });
                              setCountryOpen(false);
                            }}
                            onMouseDown={() => {
                              onFiltersChange({ ...filters, country: undefined });
                              setCountryOpen(false);
                            }}
                            className="!pointer-events-auto cursor-pointer"
                            style={{ pointerEvents: 'auto' }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                !filters.country ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            All countries
                          </CommandItem>
                          {availableCountries.map((country) => (
                            <CommandItem
                              key={country}
                              value={country}
                              onSelect={(currentValue) => {
                                onFiltersChange({ ...filters, country: currentValue });
                                setCountryOpen(false);
                              }}
                              onMouseDown={() => {
                                onFiltersChange({ ...filters, country });
                                setCountryOpen(false);
                              }}
                              className="!pointer-events-auto cursor-pointer"
                              style={{ pointerEvents: 'auto' }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  filters.country === country ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {country}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Provider Filter with Command */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  KYC Provider ({availableProviders.length})
                </label>
                <Popover open={providerOpen} onOpenChange={setProviderOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={providerOpen}
                      className="w-full justify-between"
                    >
                      {filters.provider
                        ? availableProviders.find((p) => p.value === filters.provider)?.label
                        : 'All providers'}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search provider..." />
                      <CommandList>
                        <CommandEmpty>No provider found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            onSelect={() => {
                              onFiltersChange({ ...filters, provider: undefined });
                              setProviderOpen(false);
                            }}
                            onMouseDown={() => {
                              onFiltersChange({ ...filters, provider: undefined });
                              setProviderOpen(false);
                            }}
                            className="!pointer-events-auto cursor-pointer"
                            style={{ pointerEvents: 'auto' }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                !filters.provider ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            All providers
                          </CommandItem>
                          {availableProviders.map((provider) => (
                            <CommandItem
                              key={provider.value}
                              value={provider.value}
                              onSelect={(currentValue) => {
                                onFiltersChange({ ...filters, provider: currentValue });
                                setProviderOpen(false);
                              }}
                              onMouseDown={() => {
                                onFiltersChange({ ...filters, provider: provider.value });
                                setProviderOpen(false);
                              }}
                              className="!pointer-events-auto cursor-pointer"
                              style={{ pointerEvents: 'auto' }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  filters.provider === provider.value ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {provider.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Risk Level */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Risk Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {RISK_LEVELS.map((risk) => (
                    <Button
                      key={risk.value}
                      variant={filters.riskLevel === risk.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        onFiltersChange({
                          ...filters,
                          riskLevel: filters.riskLevel === risk.value ? undefined : risk.value,
                        })
                      }
                      className="gap-2"
                    >
                      <div className={cn('h-2 w-2 rounded-full', risk.color)} />
                      {risk.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* PEP Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">PEP Status</label>
                <div className="flex gap-2">
                  <Button
                    variant={filters.pepStatus === 'true' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() =>
                      onFiltersChange({
                        ...filters,
                        pepStatus: filters.pepStatus === 'true' ? undefined : 'true',
                      })
                    }
                    className="flex-1"
                  >
                    PEP Only
                  </Button>
                  <Button
                    variant={filters.pepStatus === 'false' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() =>
                      onFiltersChange({
                        ...filters,
                        pepStatus: filters.pepStatus === 'false' ? undefined : 'false',
                      })
                    }
                    className="flex-1"
                  >
                    Non-PEP Only
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Quick Date Presets */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Quick Date Filters
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_DATES.map((preset) => (
                    <Button
                      key={preset.value}
                      variant={filters.quickDate === preset.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleQuickDate(preset.value)}
                      className="text-xs"
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Date Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Custom Date Range
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, 'MMM d, yyyy')} -{' '}
                            {format(dateRange.to, 'MMM d, yyyy')}
                          </>
                        ) : (
                          format(dateRange.from, 'MMM d, yyyy')
                        )
                      ) : (
                        'Pick a date range'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={(range) => {
                        setDateRange(range);
                        onFiltersChange({ ...filters, dateRange: range, quickDate: undefined });
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Separator />

              {/* Save Filter Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveFilter}
                className="w-full gap-2"
                disabled={activeFiltersCount === 0}
              >
                <Save className="h-4 w-4" />
                Save Filter Preset
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Saved Filters */}
        {savedFilters.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-11 w-11">
                <Bookmark className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-2" align="end">
              <div className="space-y-1">
                <div className="px-2 py-1.5 text-sm font-semibold">Saved Filters</div>
                <Separator />
                {savedFilters.map((saved, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer group"
                  >
                    <button
                      className="flex-1 text-left text-sm"
                      onClick={() => handleLoadFilter(saved)}
                    >
                      <div className="flex items-center gap-2">
                        <Star className="h-3 w-3" />
                        {saved.name}
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSavedFilter(index);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.country && (
            <Badge variant="secondary" className="gap-1">
              Country: {filters.country}
              <button
                onClick={() => onFiltersChange({ ...filters, country: undefined })}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.provider && (
            <Badge variant="secondary" className="gap-1">
              Provider: {availableProviders.find((p) => p.value === filters.provider)?.label}
              <button
                onClick={() => onFiltersChange({ ...filters, provider: undefined })}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.riskLevel && (
            <Badge variant="secondary" className="gap-1">
              Risk: {filters.riskLevel}
              <button
                onClick={() => onFiltersChange({ ...filters, riskLevel: undefined })}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.pepStatus && (
            <Badge variant="secondary" className="gap-1">
              PEP: {filters.pepStatus === 'true' ? 'Yes' : 'No'}
              <button
                onClick={() => onFiltersChange({ ...filters, pepStatus: undefined })}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.quickDate && (
            <Badge variant="secondary" className="gap-1">
              {QUICK_DATES.find((d) => d.value === filters.quickDate)?.label}
              <button
                onClick={() => onFiltersChange({ ...filters, quickDate: undefined, dateRange: undefined })}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.dateRange && !filters.quickDate && (
            <Badge variant="secondary" className="gap-1">
              {filters.dateRange.from && format(filters.dateRange.from, 'MMM d')} -{' '}
              {filters.dateRange.to && format(filters.dateRange.to, 'MMM d')}
              <button
                onClick={() => onFiltersChange({ ...filters, dateRange: undefined })}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 text-xs">
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
