/**
 * DataTableAdvanced Component
 * 
 * Advanced reusable table component with:
 * - Sortable columns with visual indicators
 * - Advanced inline filters
 * - Row selection & bulk actions
 * - Export functionality (CSV, Excel)
 * - Column visibility & density modes
 * - Responsive design
 * 
 * Reference design for all data pages
 */

'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  RowData,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

// Extend TanStack Table's meta interface for editable cells
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    updateData?: (rowIndex: number, columnId: string, value: string | number) => void;
  }
}
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Settings2,
  Download,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DataTableAdvancedProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  isLoading?: boolean;
  onRowClick?: (row: TData) => void;
  pageSize?: number;
  
  // Bulk actions
  enableRowSelection?: boolean;
  bulkActions?: {
    label: string;
    icon?: React.ReactNode;
    onClick: (selectedRows: TData[]) => void | Promise<void>;
    variant?: 'default' | 'destructive' | 'outline';
  }[];
  
  // Export
  enableExport?: boolean;
  exportFileName?: string;
  onExport?: () => void; // Custom export handler
  
  // Filters
  filters?: React.ReactNode;
  
  // Density
  defaultDensity?: 'compact' | 'standard' | 'comfortable';
  
  // Inline editing
  onDataUpdate?: (rowIndex: number, columnId: string, value: string | number) => void;
}

type DensityMode = 'compact' | 'standard' | 'comfortable';

const DENSITY_CONFIG = {
  compact: { padding: 'py-2', fontSize: 'text-xs' },
  standard: { padding: 'py-3', fontSize: 'text-sm' },
  comfortable: { padding: 'py-4', fontSize: 'text-base' },
};

export function DataTableAdvanced<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
  isLoading = false,
  onRowClick,
  pageSize = 20,
  enableRowSelection = false,
  bulkActions = [],
  enableExport = false,
  exportFileName = 'export',
  onExport,
  filters,
  defaultDensity = 'standard',
  onDataUpdate,
}: DataTableAdvancedProps<TData, TValue>): React.ReactElement {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [density, setDensity] = React.useState<DensityMode>(defaultDensity);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    meta: {
      updateData: onDataUpdate,
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
    enableRowSelection,
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original);
  const hasSelection = selectedRows.length > 0;

  // Export to CSV (uses actual rendered cell values from table)
  const exportToCSV = () => {
    // Get all visible columns (excluding select and actions)
    const exportColumns = table.getAllColumns()
      .filter(col => 
        col.getIsVisible() && 
        col.id !== 'select' && 
        col.id !== 'actions'
      );
    
    // Get headers from column definitions
    const headers = exportColumns.map(col => {
      const header = col.columnDef.header;
      if (typeof header === 'string') return header;
      if (typeof header === 'function') {
        // Try to extract text from header component
        const headerContent = header({ column: col, header: col as any, table });
        if (typeof headerContent === 'string') return headerContent;
        return col.id;
      }
      return col.id;
    });
    
    // Get visible rows
    const rows = table.getFilteredRowModel().rows.map(row => {
      return exportColumns.map(col => {
        const cellValue = row.getValue(col.id);
        
        // Handle different value types
        if (cellValue === null || cellValue === undefined) return '';
        if (typeof cellValue === 'boolean') return cellValue ? 'Yes' : 'No';
        if (typeof cellValue === 'number') return cellValue.toString();
        if (cellValue instanceof Date) return cellValue.toISOString();
        if (typeof cellValue === 'object') {
          // Extract meaningful value from objects
          if ('status' in cellValue) return (cellValue as any).status;
          if ('count' in cellValue) return (cellValue as any).count;
          return JSON.stringify(cellValue);
        }
        
        // Escape CSV special characters
        const stringValue = String(cellValue);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
      });
    });

    // Build CSV content
    const csv = [
      headers.map(h => `"${h}"`).join(','), // Quote headers
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Add UTF-8 BOM for Excel compatibility
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportFileName}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const densityConfig = DENSITY_CONFIG[density];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {/* Inline Filters */}
        {filters && (
          <>
            {filters}
          </>
        )}

        {/* Search */}
        {searchKey && (
          <div className="w-[200px] flex-shrink-0">
            <Input
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
              onChange={(event) =>
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
              }
              className="h-9"
            />
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1 min-w-[20px]" />

        {/* Right Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Export */}
          {enableExport && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onExport || exportToCSV}
              className="h-9"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}

          {/* Density */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Settings2 className="h-4 w-4 mr-2" />
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Density</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={density === 'compact'}
                onCheckedChange={() => setDensity('compact')}
              >
                Compact
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={density === 'standard'}
                onCheckedChange={() => setDensity('standard')}
              >
                Standard
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={density === 'comfortable'}
                onCheckedChange={() => setDensity('comfortable')}
              >
                Comfortable
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Column Visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {hasSelection && bulkActions.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted/50 border rounded-lg">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-semibold">
              {selectedRows.length} selected
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.resetRowSelection()}
              className="h-7"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {bulkActions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'outline'}
                size="sm"
                onClick={() => action.onClick(selectedRows)}
                className="h-8"
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();
                  
                  return (
                    <TableHead key={header.id} className={densityConfig.padding}>
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            'flex items-center gap-2',
                            canSort && 'cursor-pointer select-none hover:text-foreground',
                            densityConfig.fontSize
                          )}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {canSort && (
                            <span className="ml-1">
                              {isSorted === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : isSorted === 'desc' ? (
                                <ArrowDown className="h-3 w-3" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 opacity-50" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: pageSize }).map((_, index) => (
                <TableRow key={index}>
                  {columns.map((_, cellIndex) => (
                    <TableCell key={cellIndex} className={densityConfig.padding}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(
                    onRowClick && 'cursor-pointer hover:bg-muted/50',
                    densityConfig.padding
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cn(densityConfig.padding, densityConfig.fontSize)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="flex-1 text-sm text-muted-foreground">
          {hasSelection ? (
            <span>
              {selectedRows.length} of {table.getFilteredRowModel().rows.length} row(s) selected
            </span>
          ) : (
            <span>
              {table.getFilteredRowModel().rows.length} total row(s)
            </span>
          )}
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={table.getState().pagination.pageSize.toString()}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 40, 50, 100].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

