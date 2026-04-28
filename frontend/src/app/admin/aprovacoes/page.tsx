"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { KanbanBoard } from "@/components/aprovacoes/KanbanBoard";
import { AprovacaoDetailModal } from "@/components/aprovacoes/AprovacaoDetailModal";
import { CriarAprovacaoModal } from "@/components/aprovacoes/CriarAprovacaoModal";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import type { Aprovacao, Cliente, Paginated } from "@/types/api";

export default function AdminAprovacoesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filtroCliente, setFiltroCliente] = useState<string>("todos");
  const [criarOpen, setCriarOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Paginated<Cliente>>("/admin/clientes?page_size=100")
      .then((r) => setClientes(r.items))
      .catch(() => setClientes([]));
  }, []);

  const fetcher = useCallback(
    (signal: AbortSignal): Promise<Paginated<Aprovacao>> => {
      const params = new URLSearchParams({ page_size: "100" });
      if (filtroCliente !== "todos") params.set("cliente_id", filtroCliente);
      return api.get<Paginated<Aprovacao>>(
        `/admin/aprovacoes?${params.toString()}`,
        { signal },
      );
    },
    [filtroCliente],
  );

  const { data, error, loading, refetch } = useApi<Paginated<Aprovacao>>(
    fetcher,
    [filtroCliente],
  );

  const cards = useMemo(() => data?.items ?? [], [data]);
  const clienteSelecionado =
    filtroCliente !== "todos"
      ? clientes.find((c) => c.id === filtroCliente)
      : null;

  return (
    <AdminShell
      title="Aprovações"
      subtitle={
        clienteSelecionado
          ? `${cards.length} card(s) · ${clienteSelecionado.nome_empresa}`
          : data
            ? `${data.total} card(s) · ${new Set(cards.map((c) => c.cliente_id)).size} cliente(s)`
            : undefined
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltroCliente("todos")}
              className={`h-8 rounded-full px-3 text-xs font-medium transition ${
                filtroCliente === "todos"
                  ? "bg-brand-700 text-white"
                  : "bg-ink-100 text-ink-700 hover:bg-ink-200"
              }`}
            >
              Todos os clientes
            </button>
            {clientes.map((c) => {
              const ativo = filtroCliente === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFiltroCliente(c.id)}
                  className={`h-8 rounded-full px-3 text-xs font-medium transition ${
                    ativo
                      ? "bg-brand-700 text-white"
                      : "bg-ink-100 text-ink-700 hover:bg-ink-200"
                  }`}
                >
                  {c.nome_empresa}
                </button>
              );
            })}
          </div>
          <Button onClick={() => setCriarOpen(true)}>+ Novo card</Button>
        </div>

        {loading ? (
          <LoadingState label="Carregando board…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : cards.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-base font-semibold text-ink-950">
              Nenhum card neste filtro
            </p>
            <p className="max-w-sm text-sm text-ink-500">
              Crie um novo card pra começar a planejar o conteúdo
              {clienteSelecionado ? ` de ${clienteSelecionado.nome_empresa}` : ""}.
            </p>
            <Button size="sm" onClick={() => setCriarOpen(true)} className="mt-2">
              + Novo card
            </Button>
          </Card>
        ) : (
          <KanbanBoard
            cards={cards}
            role="admin"
            onCardClick={(a) => setDetailId(a.id)}
            onChange={refetch}
          />
        )}
      </div>

      <CriarAprovacaoModal
        open={criarOpen}
        onClose={() => setCriarOpen(false)}
        onCreated={() => refetch()}
        clientePreSelecionado={
          filtroCliente !== "todos" ? filtroCliente : undefined
        }
      />
      <AprovacaoDetailModal
        open={!!detailId}
        onClose={() => setDetailId(null)}
        aprovacaoId={detailId}
        role="admin"
        onChange={refetch}
      />
    </AdminShell>
  );
}
