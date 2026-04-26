"use client";

import { useCallback } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import type { Cliente, Paginated } from "@/types/api";

export default function VisualizarComoClientePage() {
  const fetcher = useCallback(
    (signal: AbortSignal) =>
      api.get<Paginated<Cliente>>("/admin/clientes?page_size=100", { signal }),
    [],
  );
  const { data, error, loading, refetch } = useApi<Paginated<Cliente>>(
    fetcher,
    [],
  );
  const items = data?.items ?? [];

  return (
    <AdminShell
      title="Ver como cliente"
      subtitle="Pré-visualize o painel exatamente como cada cliente vê"
    >
      <div className="flex flex-col gap-6">
        <Card>
          <h2 className="text-base font-semibold text-ink-950">
            Como funciona
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Escolha um cliente abaixo para abrir o painel dele em modo
            pré-visualização. Você poderá trocar entre clientes a qualquer
            momento e voltar ao painel admin quando quiser.
          </p>
        </Card>

        {loading ? (
          <LoadingState label="Carregando clientes…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : items.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-base font-semibold text-ink-950">
              Nenhum cliente cadastrado
            </p>
            <p className="max-w-sm text-sm text-ink-500">
              Cadastre um cliente em{" "}
              <Link className="font-medium text-brand-700 hover:underline" href="/admin/clientes">
                /admin/clientes
              </Link>{" "}
              para visualizar o painel dele.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => (
              <Link
                key={c.id}
                href={`/admin/visualizar/${c.id}`}
                className="group rounded-2xl border border-ink-200 bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-accent-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-base font-semibold text-brand-700">
                    {iniciais(c.nome_empresa)}
                  </div>
                  {c.instagram_conectado ? (
                    <Badge tone="success">Conectado</Badge>
                  ) : (
                    <Badge tone="warning">Pendente</Badge>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-base font-semibold text-ink-950">
                    {c.nome_empresa}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">{c.email}</p>
                </div>
                <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent-600 transition group-hover:text-accent-700">
                  Visualizar painel →
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const a = partes[0]?.[0] ?? "";
  const b = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return (a + b).toUpperCase();
}
