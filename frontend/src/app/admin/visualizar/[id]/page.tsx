"use client";

import { use, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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
import { formatDate, formatRelative } from "@/lib/format";
import type {
  Aprovacao,
  Cliente,
  DashboardData,
  Paginated,
  Postagem,
} from "@/types/api";

type Aba = "dashboard" | "postagens" | "aprovacoes" | "metricas";

const ABAS: { id: Aba; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "postagens", label: "Postagens" },
  { id: "aprovacoes", label: "Aprovações" },
  { id: "metricas", label: "Métricas manuais" },
];

export default function VisualizarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [aba, setAba] = useState<Aba>("dashboard");

  const clienteFetcher = useCallback(
    (signal: AbortSignal) =>
      api.get<Cliente>(`/admin/clientes/${id}`, { signal }),
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

  const primeiroNome = cliente.nome.split(" ")[0];

  return (
    <AppShell
      title={`Olá, ${primeiroNome} 👋`}
      subtitle={cliente.nome_empresa}
      topBanner={banner}
      userOverride={{ nome: cliente.nome, email: cliente.email }}
    >
      <nav
        aria-label="Abas"
        className="mb-6 flex flex-wrap gap-1 border-b border-ink-200"
      >
        {ABAS.map((a) => {
          const ativo = aba === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setAba(a.id)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                ativo
                  ? "border-accent-500 text-accent-700"
                  : "border-transparent text-ink-500 hover:text-ink-950"
              }`}
            >
              {a.label}
            </button>
          );
        })}
      </nav>

      {aba === "dashboard" && <AbaDashboard clienteId={id} />}
      {aba === "postagens" && <AbaPostagens clienteId={id} />}
      {aba === "aprovacoes" && <AbaAprovacoes clienteId={id} />}
      {aba === "metricas" && <AbaMetricas clienteId={id} />}
    </AppShell>
  );
}

function AbaDashboard({ clienteId }: { clienteId: string }) {
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoPadrao());
  const fetcher = useMemo(
    () => (signal: AbortSignal) => {
      const params = new URLSearchParams({
        periodo_inicio: periodo.inicio,
        periodo_fim: periodo.fim,
      });
      return api.get<DashboardData>(
        `/admin/clientes/${clienteId}/dashboard?${params.toString()}`,
        { signal },
      );
    },
    [clienteId, periodo.inicio, periodo.fim],
  );
  const { data, error, loading, refetch } = useApi<DashboardData>(fetcher, [
    clienteId,
    periodo.inicio,
    periodo.fim,
  ]);

  const periodoTexto = periodoLabel(periodo);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <PeriodoFiltro periodo={periodo} onChange={setPeriodo} />
        {data?.last_sync_at && (
          <p className="text-xs text-ink-500">
            Última sincronização:{" "}
            <span className="font-medium text-ink-700">
              {formatRelative(data.last_sync_at)}
            </span>
          </p>
        )}
      </div>

      {loading ? (
        <LoadingState label="Carregando dashboard…" />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : data ? (
        <DashboardContent data={data} periodoTexto={periodoTexto} />
      ) : null}
    </>
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
          Nenhuma postagem encontrada em <b>{periodoTexto}</b>. Tente um período
          maior.
        </div>
      )}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Seguidores"
          value={data.resumo.followers}
          delta={data.deltas?.followers?.percentual}
          context="Snapshot mais recente"
        />
        <KpiCard
          label="Curtidas"
          value={data.resumo.total_curtidas}
          delta={data.deltas?.curtidas?.percentual}
          context={`Soma ${periodoTexto.toLowerCase()}`}
        />
        <KpiCard
          label="Comentários"
          value={data.resumo.total_comentarios}
          delta={data.deltas?.comentarios?.percentual}
          context={`Soma ${periodoTexto.toLowerCase()}`}
        />
        <KpiCard
          label="Alcance"
          value={data.resumo.total_alcance}
          delta={data.deltas?.alcance?.percentual}
          context={`Soma ${periodoTexto.toLowerCase()}`}
        />
      </section>

      {data.campos_customizados.length > 0 && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.campos_customizados.map((c) => (
            <KpiCard
              key={c.chave}
              label={c.label}
              value={c.valor}
              context={c.sufixo ?? "Métrica customizada"}
            />
          ))}
        </section>
      )}

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
    </div>
  );
}

function AbaPostagens({ clienteId }: { clienteId: string }) {
  const fetcher = useCallback(
    (signal: AbortSignal) =>
      api.get<Paginated<Postagem>>(
        `/admin/clientes/${clienteId}/postagens?page_size=60&ordenar_por=data`,
        { signal },
      ),
    [clienteId],
  );
  const { data, loading, error, refetch } = useApi<Paginated<Postagem>>(
    fetcher,
    [clienteId],
  );

  if (loading) return <LoadingState label="Carregando postagens…" />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  const items = data?.items ?? [];
  if (items.length === 0) {
    return (
      <Card className="py-12 text-center text-sm text-ink-500">
        Nenhuma postagem sincronizada.
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((p) => (
        <PostagemCard key={p.id} postagem={p} />
      ))}
    </div>
  );
}

function AbaAprovacoes({ clienteId }: { clienteId: string }) {
  const fetcher = useCallback(
    (signal: AbortSignal) =>
      api.get<Paginated<Aprovacao>>(
        `/admin/aprovacoes?cliente_id=${clienteId}&page_size=50`,
        { signal },
      ),
    [clienteId],
  );
  const { data, loading, error, refetch } = useApi<Paginated<Aprovacao>>(
    fetcher,
    [clienteId],
  );

  if (loading) return <LoadingState label="Carregando aprovações…" />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  const items = data?.items ?? [];
  if (items.length === 0) {
    return (
      <Card className="py-12 text-center text-sm text-ink-500">
        Nenhuma aprovação registrada para esse cliente.
      </Card>
    );
  }
  return (
    <Card padded={false} className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-ink-200 bg-ink-50/60 text-xs font-semibold uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Status texto</th>
              <th className="px-4 py-3">Status arte</th>
              <th className="px-4 py-3">Postado</th>
              <th className="px-4 py-3">Data agendada</th>
              <th className="px-4 py-3">Atualizada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-200">
            {items.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3">
                  <Badge tone="brand">{a.status_texto}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone="brand">{a.status_arte}</Badge>
                </td>
                <td className="px-4 py-3 text-ink-700">
                  {a.postado_em ? "sim" : "não"}
                </td>
                <td className="px-4 py-3 text-ink-700 tabular-nums">
                  {a.data_agendada ? formatDate(a.data_agendada) : "—"}
                </td>
                <td className="px-4 py-3 text-ink-500 tabular-nums">
                  {formatDate(a.updated_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AbaMetricas({ clienteId }: { clienteId: string }) {
  return (
    <Card className="flex flex-col items-start gap-3">
      <p className="text-sm text-ink-700">
        Para inserir ou editar métricas manuais (com campos customizados),
        abra a página de gestão.
      </p>
      <Link href={`/admin/clientes/${clienteId}/metricas`}>
        <Button>Abrir gestão de métricas →</Button>
      </Link>
    </Card>
  );
}
