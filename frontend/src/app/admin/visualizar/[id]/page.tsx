"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useRouter, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { GrowthChart } from "@/components/dashboard/GrowthChart";
import { PostagemCard } from "@/components/dashboard/PostagemCard";
import { findCliente, mockClientes, mockDashboardFor } from "@/lib/mock";

export default function VisualizarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const cliente = findCliente(id);
  if (!cliente) notFound();

  const data = useMemo(() => mockDashboardFor(id), [id]);
  const destaque = data.ultimas_postagens[0];

  function handleSwitch(e: React.ChangeEvent<HTMLSelectElement>) {
    const novoId = e.target.value;
    if (novoId && novoId !== id) {
      router.push(`/admin/visualizar/${novoId}`);
    }
  }

  const banner = (
    <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-accent-300/40 bg-brand-950 px-6 py-2.5 text-white lg:px-10">
      <div className="flex items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-500/20 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-accent-300">
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <path
              d="M2.5 12C5 7 8.5 5 12 5s7 2 9.5 7c-2.5 5-6 7-9.5 7s-7-2-9.5-7z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          Pré-visualização
        </span>
        <span className="text-white/80">
          Você está vendo o painel de{" "}
          <span className="font-semibold text-white">
            {cliente.nome_empresa}
          </span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2 text-xs text-white/70">
          Trocar:
          <select
            value={id}
            onChange={handleSwitch}
            className="h-8 rounded-md border border-white/20 bg-white/10 px-2 text-xs font-medium text-white outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-400/30"
          >
            {mockClientes.map((c) => (
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

  return (
    <AppShell
      title={`Olá, ${cliente.nome.split(" ")[0]} 👋`}
      subtitle="Visão geral dos seus últimos 30 dias no Instagram"
      topBanner={banner}
      userOverride={{ nome: cliente.nome, email: cliente.email }}
    >
      <div className="flex flex-col gap-8">
        <section
          aria-label="Métricas resumidas"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <KpiCard
            label="Seguidores"
            value={data.resumo.followers}
            context="Conta Instagram conectada"
          />
          <KpiCard
            label="Curtidas"
            value={data.resumo.total_curtidas}
            context="Soma das postagens recentes"
          />
          <KpiCard
            label="Comentários"
            value={data.resumo.total_comentarios}
            context="Engajamento direto"
          />
          <KpiCard
            label="Alcance"
            value={data.resumo.total_alcance}
            context="Contas únicas atingidas"
          />
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <GrowthChart data={data.crescimento} />
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
                {data.resumo.total_postagens} postagens no total
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {data.ultimas_postagens.map((p) => (
              <PostagemCard key={p.id} postagem={p} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
