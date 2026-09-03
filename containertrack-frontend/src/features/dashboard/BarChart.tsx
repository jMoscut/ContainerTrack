interface BarChartDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartDatum[];
}

/** Minimal hand-rolled CSS bar chart — avoids pulling in a charting library dependency. */
export function BarChart({ data }: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));

  if (data.length === 0) {
    return <p className="text-sm text-gray-500">No hay datos disponibles.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-28 flex-shrink-0 truncate text-xs text-dark-brown" title={d.label}>
            {d.label}
          </span>
          <div className="h-4 flex-1 overflow-hidden rounded-full bg-sage/40">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="w-8 flex-shrink-0 text-right text-xs font-semibold text-dark-brown">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
