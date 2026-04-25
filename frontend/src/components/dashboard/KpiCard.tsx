import { Card } from "@/components/ui/Card";
import { formatCompact, formatPercent } from "@/lib/format";

type KpiCardProps = {
  label: string;
  value: number;
  delta?: number | null;
  context?: string;
  icon?: React.ReactNode;
};

export function KpiCard({ label, value, delta, context, icon }: KpiCardProps) {
  const positive = (delta ?? 0) >= 0;
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-ink-500">
          {icon && (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
              {icon}
            </span>
          )}
          <span className="text-sm font-medium">{label}</span>
        </div>
        {typeof delta === "number" && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
              positive
                ? "bg-success-100 text-success-500"
                : "bg-danger-100 text-danger-500"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className={`h-3 w-3 ${positive ? "" : "rotate-180"}`}
              aria-hidden="true"
            >
              <path
                d="M6 14l6-6 6 6"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {formatPercent(delta)}
          </span>
        )}
      </div>
      <p className="text-3xl font-semibold tracking-tight text-ink-950 tabular-nums">
        {formatCompact(value)}
      </p>
      {context && <p className="text-xs text-ink-500">{context}</p>}
    </Card>
  );
}
