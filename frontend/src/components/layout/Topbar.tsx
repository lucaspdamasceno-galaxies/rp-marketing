"use client";

import { useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";
import { useUser } from "@/hooks/useUser";

type DisplayUser = {
  nome?: string | null;
  email?: string | null;
};

type TopbarProps = {
  title: string;
  subtitle?: string;
  userOverride?: DisplayUser;
};

function iniciais(nome?: string | null): string {
  if (!nome) return "··";
  const partes = nome.trim().split(/\s+/);
  const first = partes[0]?.[0] ?? "";
  const last = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "··";
}

export function Topbar({ title, subtitle, userOverride }: TopbarProps) {
  const router = useRouter();
  const { user: real } = useUser();
  const user = userOverride ?? real;

  function handleLogout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-ink-200 bg-surface/80 px-6 backdrop-blur lg:px-10">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold text-ink-950">{title}</h1>
        {subtitle && (
          <p className="truncate text-xs text-ink-500">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-ink-950">
            {user?.nome ?? "—"}
          </p>
          <p className="text-xs text-ink-500">{user?.email ?? ""}</p>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700"
          aria-hidden="true"
        >
          {iniciais(user?.nome)}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-ink-500 transition hover:bg-ink-100 hover:text-ink-950"
          aria-label="Sair"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path
              d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h12"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
