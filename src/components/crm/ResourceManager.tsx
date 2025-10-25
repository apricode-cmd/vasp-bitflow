/**
 * Universal Resource Manager Component
 * 
 * Modern generic CRUD interface for all CRM reference tables
 */

'use client';

import { useState, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, RefreshCw, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { DataTable } from '@/components/admin/DataTable';
import { ResourceSheet } from './ResourceSheet';

interface Column {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'boolean' | 'badge' | 'color';
  render?: (value: any, item: any) => React.ReactNode;
}

interface Field {
  name: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'json' | 'array';
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

interface ResourceManagerProps {
  resource: string;
  title: string;
  description?: string;
  columns: Column[];
  fields: Field[];
  apiEndpoint: string;
  primaryKey?: string;
  searchable?: boolean;
}

export function ResourceManager({
  resource,
  title,
  description,
  columns,
  fields,
  apiEndpoint,
  primaryKey = 'id',
  searchable = true
}: ResourceManagerProps): JSX.Element {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (): Promise<void> => {
    setRefreshing(true);
    try {
      const response = await fetch(apiEndpoint);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        toast.error(`Failed to fetch ${resource}`);
      }
    } catch (error) {
      console.error(`Fetch ${resource} error:`, error);
      toast.error(`Failed to fetch ${resource}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreate = (): void => {
    setEditingItem(null);
    setShowSheet(true);
  };

  const handleEdit = (item: any): void => {
    setEditingItem(item);
    setShowSheet(true);
  };

  const openDeleteDialog = (item: any): void => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async (): Promise<void> => {
    if (!itemToDelete) return;

    try {
      const response = await fetch(`${apiEndpoint}/${itemToDelete[primaryKey]}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`${resource} deleted successfully`);
        await fetchData();
      } else {
        toast.error(result.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete');
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleSheetSuccess = async (): Promise<void> => {
    await fetchData();
    setShowSheet(false);
    setEditingItem(null);
  };

  const renderCell = (column: Column, item: any): React.ReactNode => {
    const value = item[column.key];

    if (column.render) {
      return column.render(value, item);
    }

    switch (column.type) {
      case 'boolean':
        return value ? (
          <Badge variant="success">Yes</Badge>
        ) : (
          <Badge variant="secondary">No</Badge>
        );

      case 'badge':
        return <Badge>{value}</Badge>;

      case 'color':
        return (
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded border"
              style={{ backgroundColor: value }}
            />
            <span className="text-sm font-mono">{value}</span>
          </div>
        );

      case 'number':
        return <span className="font-mono">{value?.toLocaleString()}</span>;

      default:
        return <span>{value}</span>;
    }
  };

  // Build DataTable columns from provided column config
  const tableColumns: ColumnDef<any>[] = [
    ...columns.map((col) => ({
      accessorKey: col.key,
      header: col.label,
      cell: ({ row }: any) => renderCell(col, row.original),
    })),
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }: any) => {
        const item = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleEdit(item)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => openDeleteDialog(item)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={fetchData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={handleCreate} className="gradient-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add New
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={tableColumns}
        data={data}
        searchKey={searchable ? columns[0]?.key : undefined}
        searchPlaceholder={`Search ${resource}...`}
        isLoading={loading}
        pageSize={15}
      />

      {/* Create/Edit Sheet */}
      <ResourceSheet
        isOpen={showSheet}
        onClose={() => {
          setShowSheet(false);
          setEditingItem(null);
        }}
        onSuccess={handleSheetSuccess}
        title={`${editingItem ? 'Edit' : 'Create'} ${resource}`}
        fields={fields}
        apiEndpoint={editingItem ? `${apiEndpoint}/${editingItem[primaryKey]}` : apiEndpoint}
        initialData={editingItem}
        isEdit={!!editingItem}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {resource}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this {resource} 
              and may affect related data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
