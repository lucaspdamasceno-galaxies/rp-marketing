"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { GrowthChart } from "@/components/dashboard/GrowthChart";
import { PostagemCard } from "@/components/dashboard/PostagemCard";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useUser } from "@/hooks/useUser";
import { isDemo } from "@/lib/demo";
import { mockDashboard } from "@/lib/mock";
import type { DashboardData } from "@/types/api";

export default function DashboardPage() {
  const { user } = useUser();
  const { data, error, loading, refetch } = useApi<DashboardData>(
    (signal) =>
      isDemo()
        ? Promise.resolve(mockDashboard)
        : api.get<DashboardData>("/dashboard", { signal }),
    [],
  );

  const primeiroNome = user?.nome?.split(" ")[0] ?? "";

  return (
    <AppShell
      title={primeiroNome ? `Olá, ${primeiroNome} 👋` : "Dashboard"}
      subtitle="Visão geral dos seus últimos 30 dias no Instagram"
    >
      {loading ? (
        <LoadingState label="Carregando dashboard…" />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : data ? (
        <DashboardContent data={data} />
      ) : null}
    </AppShell>
  );
}

function DashboardContent({ data }: { data: DashboardData }) {
  const destaque = data.ultimas_postagens[0];

  return (
    <div className="flex flex-col gap-8">
      <section
        aria-label="Métricas resumidas"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <KpiCard
          label="Seguidores"
          value={data.resumo.followers}
          context="Conta Instagram conectada"
          icon={<IconUsers />}
        />
        <KpiCard
          label="Curtidas"
          value={data.resumo.total_curtidas}
          context="Soma das postagens recentes"
          icon={<IconHeart />}
        />
        <KpiCard
          label="Comentários"
          value={data.resumo.total_comentarios}
          context="Engajamento direto do público"
          icon={<IconComment />}
        />
        <KpiCard
          label="Alcance"
          value={data.resumo.total_alcance}
          context="Contas únicas atingidas"
          icon={<IconReach />}
        />
      </section>

      <section
        aria-label="Crescimento de seguidores"
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <div className="lg:col-span-2">
          <GrowthChart data={data.crescimento} />
        </div>
        {destaque ? (
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
            <Link
              href={`/postagens/${destaque.id}`}
              className="mt-auto inline-flex h-9 items-center justify-center rounded-lg bg-accent-50 px-3 text-sm font-medium text-accent-700 hover:bg-accent-100"
            >
              Ver detalhes →
            </Link>
          </Card>
        ) : (
          <Card className="flex flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-semibold text-ink-950">
              Sem postagens ainda
            </p>
            <p className="max-w-xs text-xs text-ink-500">
              Quando seu Instagram for sincronizado, suas postagens aparecerão
              aqui.
            </p>
          </Card>
        )}
      </section>

      <section aria-label="Últimas postagens">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink-950">
              Últimas postagens
            </h2>
            <p className="text-sm text-ink-500">
              {data.resumo.total_postagens} postagens no total
            </p>
          </div>
          <Link
            href="/postagens"
            className="text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            Ver todas →
          </Link>
        </div>
        {data.ultimas_postagens.length === 0 ? (
          <Card className="py-12 text-center text-sm text-ink-500">
            Nenhuma postagem sincronizada ainda.
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

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M3 20a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6M21 20a6 6 0 0 0-5-5.92"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconComment() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M21 12a8 8 0 0 1-11.6 7.16L4 20l1.05-4.13A8 8 0 1 1 21 12z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconReach() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M2.5 12C5 7 8.5 5 12 5s7 2 9.5 7c-2.5 5-6 7-9.5 7s-7-2-9.5-7z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
