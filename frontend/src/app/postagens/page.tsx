"use client";

import { useCallback, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PostagemCard } from "@/components/dashboard/PostagemCard";
import { Card } from "@/components/ui/Card";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import type {
  OrdenarPostagensPor,
  Paginated,
  Postagem,
  TipoPostagem,
} from "@/types/api";

type TipoFiltro = "TODOS" | TipoPostagem;

const TIPOS: { value: TipoFiltro; label: string }[] = [
  { value: "TODOS", label: "Todos" },
  { value: "IMAGE", label: "Imagens" },
  { value: "REEL", label: "Reels" },
  { value: "CAROUSEL", label: "Carrosséis" },
];

export default function PostagensPage() {
  const [tipo, setTipo] = useState<TipoFiltro>("TODOS");
  const [ordem, setOrdem] = useState<OrdenarPostagensPor>("data");

  const fetcher = useCallback(
    (signal: AbortSignal) => {
      const params = new URLSearchParams({
        ordenar_por: ordem,
        page_size: "60",
      });
      return api.get<Paginated<Postagem>>(
        `/postagens?${params.toString()}`,
        { signal },
      );
    },
    [ordem],
  );

  const { data, error, loading, refetch } = useApi<Paginated<Postagem>>(
    fetcher,
    [ordem],
  );

  const itensFiltrados =
    data && tipo !== "TODOS"
      ? data.items.filter((p) => p.tipo === tipo)
      : (data?.items ?? []);

  return (
    <AppShell
      title="Postagens"
      subtitle={
        data ? `${itensFiltrados.length} de ${data.total} postagens` : undefined
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div
            role="tablist"
            aria-label="Filtrar por tipo"
            className="inline-flex items-center gap-1 rounded-xl border border-ink-200 bg-surface p-1"
          >
            {TIPOS.map((t) => {
              const ativo = t.value === tipo;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  aria-selected={ativo}
                  onClick={() => setTipo(t.value)}
                  className={`h-8 rounded-lg px-3 text-sm font-medium transition ${
                    ativo
                      ? "bg-brand-700 text-white"
                      : "text-ink-700 hover:bg-ink-100"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-ink-500">
            Ordenar por
            <select
              value={ordem}
              onChange={(e) => setOrdem(e.target.value as OrdenarPostagensPor)}
              className="h-9 rounded-lg border border-ink-300 bg-surface px-3 text-sm font-medium text-ink-950 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
            >
              <option value="data">Mais recentes</option>
              <option value="engajamento">Maior engajamento</option>
            </select>
          </label>
        </div>

        {loading ? (
          <LoadingState label="Carregando postagens…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : itensFiltrados.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-base font-semibold text-ink-950">
              Nenhuma postagem com esse filtro
            </p>
            <p className="max-w-sm text-sm text-ink-500">
              Tente outro tipo de mídia ou aguarde a próxima sincronização do
              Instagram.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {itensFiltrados.map((p) => (
              <PostagemCard key={p.id} postagem={p} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
