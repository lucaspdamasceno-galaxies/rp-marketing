import { Card } from "@/components/ui/Card";
import { formatCompact, formatDate } from "@/lib/format";

type Point = { data: string; followers: number };

type GrowthChartProps = {
  data: Point[];
};

const W = 760;
const H = 240;
const PAD_X = 32;
const PAD_TOP = 24;
const PAD_BOTTOM = 32;

export function GrowthChart({ data }: GrowthChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <p className="text-sm text-ink-500">Sem dados ainda.</p>
      </Card>
    );
  }

  const min = Math.min(...data.map((p) => p.followers));
  const max = Math.max(...data.map((p) => p.followers));
  const range = max - min || 1;

  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  const x = (i: number) =>
    PAD_X + (i / Math.max(1, data.length - 1)) * innerW;
  const y = (v: number) =>
    PAD_TOP + innerH - ((v - min) / range) * innerH;

  const linePath = data
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.followers)}`)
    .join(" ");

  const areaPath = `${linePath} L ${x(data.length - 1)} ${PAD_TOP + innerH} L ${x(0)} ${PAD_TOP + innerH} Z`;

  const first = data[0];
  const last = data[data.length - 1];
  const delta = last.followers - first.followers;
  const deltaPct = (delta / first.followers) * 100;

  const ticks = [0, Math.floor(data.length / 2), data.length - 1];

  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-ink-500">Crescimento</p>
          <p className="text-xl font-semibold text-ink-950">
            Últimos 30 dias
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums">
            +{formatCompact(delta)}
          </p>
          <p className="text-xs text-success-500">
            +{deltaPct.toFixed(1)}% no período
          </p>
        </div>
      </div>

      <div className="mt-6 -mx-2 overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block min-w-[640px] w-full text-accent-500"
          role="img"
          aria-label="Gráfico de crescimento de seguidores nos últimos 30 dias"
        >
          <defs>
            <linearGradient id="growth-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75, 1].map((t) => (
            <line
              key={t}
              x1={PAD_X}
              x2={W - PAD_X}
              y1={PAD_TOP + innerH * t}
              y2={PAD_TOP + innerH * t}
              stroke="#e3e2ea"
              strokeDasharray="3 4"
              strokeWidth="1"
            />
          ))}

          <path d={areaPath} fill="url(#growth-fill)" />
          <path
            d={linePath}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          <circle
            cx={x(data.length - 1)}
            cy={y(last.followers)}
            r="5"
            fill="currentColor"
          />
          <circle
            cx={x(data.length - 1)}
            cy={y(last.followers)}
            r="10"
            fill="currentColor"
            opacity="0.18"
          />

          {ticks.map((i) => (
            <text
              key={i}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              className="fill-ink-400"
              style={{ fontSize: 11 }}
            >
              {formatDate(data[i].data)}
            </text>
          ))}
        </svg>
      </div>
    </Card>
  );
}
