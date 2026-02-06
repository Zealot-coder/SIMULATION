"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Download,
} from "lucide-react";

export interface Column<T = any> {
  key: string;
  title: string;
  sortable?: boolean;
  width?: string;
  render?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T = any> {
  columns: Column<T>[];
  rows: T[];
  className?: string;
  loading?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  maxItems?: number;
  emptyState?: {
    title?: string;
    description?: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  onRowClick?: (row: T) => void;
  selectedRows?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
}

export function DataTable<T extends { id?: string } | Record<string, any>>({
  columns,
  rows,
  className,
  loading = false,
  searchable = false,
  filterable = false,
  pagination = false,
  pageSize = 10,
  maxItems,
  emptyState,
  onRowClick,
  selectedRows,
  onSelectionChange,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter rows based on search
  const filteredRows = searchable && searchQuery
    ? rows.filter(row => 
        columns.some(col => {
          const value = (row as any)[col.key];
          return String(value).toLowerCase().includes(searchQuery.toLowerCase());
        })
      )
    : rows;

  // Sort rows
  const sortedRows = sortColumn
    ? [...filteredRows].sort((a, b) => {
        const aVal = (a as any)[sortColumn];
        const bVal = (b as any)[sortColumn];
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortDirection === "asc" ? comparison : -comparison;
      })
    : filteredRows;

  // Paginate rows or limit by maxItems
  const totalPages = pagination ? Math.ceil(sortedRows.length / pageSize) : 1;
  let paginatedRows = pagination
    ? sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sortedRows;
  
  // Apply maxItems limit if specified
  if (maxItems && !pagination) {
    paginatedRows = paginatedRows.slice(0, maxItems);
  }

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  };

  if (loading) {
    return (
      <div className={cn("rounded-lg border bg-card shadow-sm overflow-hidden", className)}>
        <div className="p-4 border-b space-y-3">
          <div className="animate-shimmer h-9 w-full max-w-sm rounded" />
        </div>
        <div className="divide-y">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex gap-4">
              <div className="animate-shimmer h-4 w-24 rounded" />
              <div className="animate-shimmer h-4 w-32 rounded" />
              <div className="animate-shimmer h-4 w-20 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border bg-card shadow-sm overflow-hidden", className)}>
      {/* Toolbar */}
      {(searchable || filterable) && (
        <div className="p-4 border-b flex items-center justify-between gap-4">
          {searchable && (
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            {filterable && (
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider",
                    column.sortable && "cursor-pointer hover:bg-muted/80 transition-colors",
                    column.width
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.title}
                    {column.sortable && (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12">
                  <div className="text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Search className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <h4 className="text-sm font-medium mb-1">
                      {emptyState?.title || "No data found"}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      {emptyState?.description || "Try adjusting your search or filters"}
                    </p>
                    {emptyState?.action && (
                      <Button size="sm" onClick={emptyState.action.onClick}>
                        {emptyState.action.label}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, index) => (
                <tr
                  key={row.id || index}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "transition-colors duration-150",
                    "hover:bg-muted/50",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-sm">
                      {column.render 
                        ? column.render(row)
                        : (row as any)[column.key]
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="p-4 border-t flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedRows.length)} of {sortedRows.length} results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-[60px] text-center">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
