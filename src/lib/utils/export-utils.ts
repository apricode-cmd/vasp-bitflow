/**
 * Export Utilities
 * 
 * Helper functions for exporting data to CSV/Excel
 */

/**
 * Convert any value to CSV-safe string
 */
export function formatCellForExport(value: any): string {
  // Handle null/undefined
  if (value === null || value === undefined) return '';
  
  // Handle booleans
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  
  // Handle numbers
  if (typeof value === 'number') return value.toString();
  
  // Handle dates
  if (value instanceof Date) {
    return value.toISOString().split('T')[0]; // YYYY-MM-DD format
  }
  
  // Handle objects (nested data)
  if (typeof value === 'object') {
    // Try to extract meaningful values
    if ('status' in value) return String(value.status);
    if ('name' in value) return String(value.name);
    if ('count' in value) return String(value.count);
    if ('firstName' in value && 'lastName' in value) {
      return `${value.firstName} ${value.lastName}`.trim();
    }
    // Last resort: stringify
    return JSON.stringify(value);
  }
  
  // Handle strings - escape CSV special characters
  const stringValue = String(value);
  
  // Remove or replace problematic characters
  const cleaned = stringValue
    .replace(/[\r\n]+/g, ' ') // Replace line breaks with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // Quote if contains special characters
  if (cleaned.includes(',') || cleaned.includes('"') || cleaned.includes(';')) {
    return `"${cleaned.replace(/"/g, '""')}"`;
  }
  
  return cleaned;
}

/**
 * Export data to CSV with proper formatting
 */
export function exportToCSV(
  data: any[],
  columns: Array<{ key: string; header: string; formatter?: (value: any, row: any) => string }>,
  filename: string
): void {
  // Build headers
  const headers = columns.map(col => `"${col.header}"`).join(',');
  
  // Build rows
  const rows = data.map(row => {
    return columns.map(col => {
      const value = row[col.key];
      
      // Use custom formatter if provided
      if (col.formatter) {
        return formatCellForExport(col.formatter(value, row));
      }
      
      return formatCellForExport(value);
    }).join(',');
  });
  
  // Combine headers and rows
  const csv = [headers, ...rows].join('\n');
  
  // Add UTF-8 BOM for Excel compatibility
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  
  // Trigger download
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Format currency for export (without symbols)
 */
export function formatCurrencyForExport(amount: number, currency: string = 'EUR'): string {
  return amount.toFixed(2);
}

/**
 * Format date for export (YYYY-MM-DD HH:mm:ss)
 */
export function formatDateTimeForExport(date: Date | string | null): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().replace('T', ' ').split('.')[0];
}

/**
 * Format date for export (YYYY-MM-DD)
 */
export function formatDateForExport(date: Date | string | null): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split('T')[0];
}

