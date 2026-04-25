import { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="flex flex-1 flex-col bg-surface">
        <div className="px-6 pt-8 lg:px-12">
          <Logo size="md" />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <div className="px-6 pb-6 text-xs text-ink-400 lg:px-12">
          © {new Date().getFullYear()} RP Marketing
        </div>
      </div>
      <aside className="relative hidden flex-1 overflow-hidden bg-brand-950 lg:flex lg:flex-col lg:justify-between">
        <DecorPattern />
        <div className="relative z-10 px-12 pt-12">
          <Logo size="md" variant="light" />
        </div>
        <div className="relative z-10 px-12 pb-16 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-400">
            De estratégia a resultados reais
          </p>
          <h2 className="mt-3 max-w-md text-4xl font-bold leading-tight tracking-tight">
            Suas redes em números, sem ruído.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">
            Mais visibilidade. Mais relacionamento. Mais conversões. Mais
            resultados — em um painel feito para decisão.
          </p>
        </div>
      </aside>
    </div>
  );
}

function DecorPattern() {
  return (
    <svg
      className="absolute inset-0 h-full w-full opacity-40"
      viewBox="0 0 600 800"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="g1" cx="0.2" cy="0.3" r="0.6">
          <stop offset="0%" stopColor="#1e90ff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#030b26" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="g2" cx="0.8" cy="0.8" r="0.5">
          <stop offset="0%" stopColor="#3da9ff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#030b26" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="600" height="800" fill="url(#g1)" />
      <rect width="600" height="800" fill="url(#g2)" />
      {Array.from({ length: 12 }).map((_, i) => (
        <circle
          key={i}
          cx={50 + i * 50}
          cy={120 + (i % 3) * 220}
          r={2 + (i % 4)}
          fill="white"
          opacity={0.15 + (i % 5) * 0.05}
        />
      ))}
    </svg>
  );
}
