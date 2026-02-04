export function KpiCard({ title, value, delta }: { title: string; value: string | number; delta?: string }) {
  return (
    <div className="border rounded p-4 bg-white shadow-sm">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {delta ? <div className="text-sm text-muted-foreground">{delta}</div> : null}
    </div>
  );
}
