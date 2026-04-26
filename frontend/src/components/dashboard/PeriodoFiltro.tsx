"use client";

type Preset = { label: string; dias: number };

const PRESETS: Preset[] = [
  { label: "7 dias", dias: 7 },
  { label: "30 dias", dias: 30 },
  { label: "90 dias", dias: 90 },
];

export type Periodo = {
  inicio: string;
  fim: string;
};

type Props = {
  periodo: Periodo;
  onChange: (p: Periodo) => void;
};

function isoMidnight(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function diasAtras(dias: number): Periodo {
  const fim = new Date();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - dias);
  return { inicio: isoMidnight(inicio), fim: fim.toISOString() };
}

export function periodoPadrao(): Periodo {
  return diasAtras(30);
}

export function periodoLabel(p: Periodo): string {
  const inicio = new Date(p.inicio);
  const fim = new Date(p.fim);
  const dias = Math.round((fim.getTime() - inicio.getTime()) / 86400000);

  for (const preset of PRESETS) {
    if (Math.abs(preset.dias - dias) <= 1) {
      const padrao = diasAtras(preset.dias);
      if (padrao.inicio.slice(0, 10) === p.inicio.slice(0, 10)) {
        return `Últimos ${preset.dias} dias`;
      }
    }
  }

  const fmt = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  });
  return `${fmt.format(inicio)} – ${fmt.format(fim)}`;
}

function dateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

export function PeriodoFiltro({ periodo, onChange }: Props) {
  const presetAtivo = PRESETS.find((p) => {
    const { inicio } = diasAtras(p.dias);
    return inicio.slice(0, 10) === periodo.inicio.slice(0, 10);
  });

  function aplicarPreset(dias: number) {
    onChange(diasAtras(dias));
  }

  function aplicarCustom(field: "inicio" | "fim", value: string) {
    const d = new Date(value + "T00:00:00");
    if (Number.isNaN(d.getTime())) return;
    onChange({ ...periodo, [field]: d.toISOString() });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          const ativo = presetAtivo?.dias === p.dias;
          return (
            <button
              key={p.dias}
              type="button"
              onClick={() => aplicarPreset(p.dias)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                ativo
                  ? "border-accent-500 bg-accent-50 text-accent-700"
                  : "border-ink-200 bg-surface text-ink-700 hover:border-ink-300"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
        <input
          type="date"
          value={dateInputValue(periodo.inicio)}
          onChange={(e) => aplicarCustom("inicio", e.target.value)}
          className="h-8 rounded-lg border border-ink-200 bg-surface px-2 text-ink-950 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
        />
        <span>até</span>
        <input
          type="date"
          value={dateInputValue(periodo.fim)}
          onChange={(e) => aplicarCustom("fim", e.target.value)}
          className="h-8 rounded-lg border border-ink-200 bg-surface px-2 text-ink-950 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
        />
      </div>
    </div>
  );
}
