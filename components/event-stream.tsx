import React from "react";

export function EventStream({ items }: { items: Array<{ id: string; time: string; title: string; details?: string }> }) {
  return (
    <div className="border rounded p-4 bg-white">
      <div className="text-sm font-semibold mb-2">Live Events</div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id} className="flex items-start gap-3">
            <div className="text-xs text-muted-foreground w-24">{new Date(it.time).toLocaleString()}</div>
            <div className="flex-1">
              <div className="font-medium">{it.title}</div>
              {it.details ? <div className="text-sm text-muted-foreground">{it.details}</div> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
