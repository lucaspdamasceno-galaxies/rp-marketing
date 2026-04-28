"use client";

import { useCallback, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { TrafegoDashboard } from "@/components/trafego/TrafegoDashboard";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import type { Paginated, RelatorioTrafego } from "@/types/api";

export default function ClienteTrafegoPage() {
  const fetcher = useCallback(
    (signal: AbortSignal): Promise<Paginated<RelatorioTrafego>> =>
      api.get(`/relatorios-trafego?page_size=100`, { signal }),
    [],
  );
  const { data, error, loading, refetch } = useApi(fetcher, []);

  const relatoriosCron = useMemo(() => {
    return [...(data?.items ?? [])].sort(
      (a, b) => a.periodo_inicio.localeCompare(b.periodo_inicio),
    );
  }, [data]);

  return (
    <AppShell
      title="Tráfego pago"
      subtitle="Performance das suas campanhas — Meta Ads e Google Ads"
    >
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <TrafegoDashboard relatorios={relatoriosCron} />
      )}
    </AppShell>
  );
}
