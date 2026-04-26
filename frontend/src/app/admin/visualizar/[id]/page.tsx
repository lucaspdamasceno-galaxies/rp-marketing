"use client";

import { use, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { GrowthChart } from "@/components/dashboard/GrowthChart";
import { PostagemCard } from "@/components/dashboard/PostagemCard";
import {
  PeriodoFiltro,
  periodoLabel,
  periodoPadrao,
  type Periodo,
} from "@/components/dashboard/PeriodoFiltro";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { formatRelative } from "@/lib/format";
import type { Cliente, DashboardData, Paginated } from "@/types/api";

export default function VisualizarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoPadrao());

  const clienteFetcher = useCallback(
    (signal: AbortSignal) => api.get<Cliente>(`/admin/clientes/${id}`, { signal }),
    [id],
  );
  const { data: cliente, error: clienteErr, loading: clienteLoading } =
    useApi<Cliente>(clienteFetcher, [id]);

  const listaFetcher = useCallback(
    (signal: AbortSignal) =>
      api.get<Paginated<Cliente>>("/admin/clientes?page_size=100", { signal }),
    [],
  );
  const { data: listaPag } = useApi<Paginated<Cliente>>(listaFetcher, []);
  const lista = listaPag?.items ?? [];

  const dashFetcher = useMemo(
    () => (signal: AbortSignal) => {
      const params = new URLSearchParams({
        periodo_inicio: periodo.inicio,
        periodo_fim: periodo.fim,
      });
      return api.get<DashboardData>(
        `/admin/clientes/${id}/dashboard?${params.toString()}`,
        { signal },
      );
    },
    [id, periodo.inicio, periodo.fim],
  );
  const {
    data: dashboard,
    error: dashErr,
    loading: dashLoading,
    refetch: refetchDash,
  } = useApi<DashboardData>(dashFetcher, [id, periodo.inicio, periodo.fim]);

  function handleSwitch(e: React.ChangeEvent<HTMLSelectElement>) {
    const novoId = e.target.value;
    if (novoId && novoId !== id) {
      router.push(`/admin/visualizar/${novoId}`);
    }
  }

  const banner = (
    <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-accent-300/40 bg-brand-950 px-4 py-2.5 text-white sm:px-6 lg:px-10">
      <div className="flex items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-500/20 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-accent-300">
          Pré-visualização
        </span>
        <span className="hidden text-white/80 sm:inline">
          Você está vendo o painel de{" "}
          <span className="font-semibold text-white">
            {cliente?.nome_empresa ?? "…"}
          </span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2 text-xs text-white/70">
          <span className="hidden sm:inline">Trocar:</span>
          <select
            value={id}
            onChange={handleSwitch}
            className="h-8 max-w-[200px] rounded-md border border-white/20 bg-white/10 px-2 text-xs font-medium text-white outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-400/30"
          >
            {lista.map((c) => (
              <option key={c.id} value={c.id} className="text-ink-950">
                {c.nome_empresa}
              </option>
            ))}
          </select>
        </label>
        <Link
          href="/admin/clientes"
          className="inline-flex h-8 items-center rounded-md bg-white/10 px-3 text-xs font-medium text-white transition hover:bg-white/20"
        >
          Sair
        </Link>
      </div>
    </div>
  );

  if (clienteLoading) {
    return (
      <AppShell title="Carregando…" topBanner={banner}>
        <LoadingState label="Carregando cliente…" />
      </AppShell>
    );
  }
  if (clienteErr || !cliente) {
    return (
      <AppShell title="Cliente não encontrado" topBanner={banner}>
        <ErrorState message={clienteErr ?? "Cliente não existe"} />
      </AppShell>
    );
  }

  const periodoTexto = periodoLabel(periodo);
  const primeiroNome = cliente.nome.split(" ")[0];

  return (
    <AppShell
      title={`Olá, ${primeiroNome} 👋`}
      subtitle="Visão geral do Instagram"
      topBanner={banner}
      userOverride={{ nome: cliente.nome, email: cliente.email }}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <PeriodoFiltro periodo={periodo} onChange={setPeriodo} />
        {dashboard?.last_sync_at && (
          <p className="text-xs text-ink-500">
            Última sincronização:{" "}
            <span className="font-medium text-ink-700">
              {formatRelative(dashboard.last_sync_at)}
            </span>
          </p>
        )}
      </div>

      {dashLoading ? (
        <LoadingState label="Carregando dashboard…" />
      ) : dashErr ? (
        <ErrorState message={dashErr} onRetry={refetchDash} />
      ) : dashboard ? (
        <DashboardContent data={dashboard} periodoTexto={periodoTexto} />
      ) : null}
    </AppShell>
  );
}

function DashboardContent({
  data,
  periodoTexto,
}: {
  data: DashboardData;
  periodoTexto: string;
}) {
  const destaque = data.ultimas_postagens[0];
  const periodoVazio = data.resumo.total_postagens === 0;

  return (
    <div className="flex flex-col gap-8">
      {periodoVazio && (
        <div
          role="status"
          className="rounded-lg border border-warning-100 bg-warning-100/40 px-4 py-3 text-sm text-ink-700"
        >
          Nenhuma postagem encontrada em <b>{periodoTexto}</b>. Curtidas,
          comentários e alcance abaixo aparecerão zerados. Tente um período
          maior.
        </div>
      )}
      <section
        aria-label="Métricas resumidas"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <KpiCard label="Seguidores" value={data.resumo.followers} context="Snapshot mais recente" />
        <KpiCard
          label="Curtidas"
          value={data.resumo.total_curtidas}
          context={`Soma ${periodoTexto.toLowerCase()}`}
        />
        <KpiCard
          label="Comentários"
          value={data.resumo.total_comentarios}
          context={`Soma ${periodoTexto.toLowerCase()}`}
        />
        <KpiCard
          label="Alcance"
          value={data.resumo.total_alcance}
          context={`Soma ${periodoTexto.toLowerCase()}`}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GrowthChart data={data.crescimento} periodoLabel={periodoTexto} />
        </div>
        {destaque && (
          <Card className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-medium text-ink-500">Em destaque</p>
              <p className="text-xl font-semibold text-ink-950">
                Última postagem publicada
              </p>
            </div>
            <div className="overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={destaque.url_midia}
                alt={destaque.legenda ?? "Postagem"}
                className="aspect-video w-full object-cover"
              />
            </div>
            <p className="line-clamp-3 text-sm text-ink-700">
              {destaque.legenda ?? "Sem legenda"}
            </p>
          </Card>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink-950">
              Últimas postagens
            </h2>
            <p className="text-sm text-ink-500">
              {data.resumo.total_postagens} postagens no período
            </p>
          </div>
        </div>
        {data.ultimas_postagens.length === 0 ? (
          <Card className="py-12 text-center text-sm text-ink-500">
            Nenhuma postagem nesse período.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {data.ultimas_postagens.map((p) => (
              <PostagemCard key={p.id} postagem={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
