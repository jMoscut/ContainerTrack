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
    <div className="flex min-w-[280px] flex-col gap-3">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-24 flex-shrink-0 truncate text-xs font-medium text-dark-brown sm:w-28" title={d.label}>
            {d.label}
          </span>
          <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-sage/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
            <div
              className="h-full rounded-full bg-gradient-primary transition-[width] duration-500 ease-out"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="w-8 flex-shrink-0 text-right text-xs font-semibold tabular-nums text-dark-brown">
            {d.value}
          </span>
        </div>
      ))}
    </div>
  );
}
