import React from "react";

export function DataTable<T>({
  columns,
  rows,
  className,
}: {
  columns: { key: string; title: string }[];
  rows: T[];
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto bg-white border rounded ${className || ""}`}>
      <table className="min-w-full divide-y">
        <thead className="bg-muted">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row: any, i) => (
            <tr key={i} className="hover:bg-surface">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2 text-sm">
                  {row[c.key] as any}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
