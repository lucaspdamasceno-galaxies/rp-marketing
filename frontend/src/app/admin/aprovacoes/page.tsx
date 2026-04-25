"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { isDemo } from "@/lib/demo";
import { mockAprovacoes } from "@/lib/mock";
import { formatDateTime, formatRelative } from "@/lib/format";
import type {
  Aprovacao,
  Paginated,
  StatusAprovacao,
  TipoPostagem,
} from "@/types/api";

const STATUS_LABEL: Record<StatusAprovacao, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

const STATUS_TONE: Record<StatusAprovacao, "warning" | "success" | "danger"> = {
  pendente: "warning",
  aprovado: "success",
  rejeitado: "danger",
};

const TIPO_LABEL: Record<TipoPostagem, string> = {
  IMAGE: "Imagem",
  VIDEO: "Vídeo",
  CAROUSEL: "Carrossel",
  REEL: "Reel",
};

type FiltroStatus = "todos" | StatusAprovacao;

export default function AdminAprovacoesPage() {
  const [filtro, setFiltro] = useState<FiltroStatus>("todos");
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState<string | null>(null);

  const fetcher = useCallback(
    (signal: AbortSignal): Promise<Paginated<Aprovacao>> => {
      if (isDemo()) {
        const items =
          filtro === "todos"
            ? mockAprovacoes
            : mockAprovacoes.filter((a) => a.status === filtro);
        return Promise.resolve({
          items,
          total: items.length,
          page: 1,
          page_size: items.length,
        });
      }
      const params = new URLSearchParams({ page_size: "50" });
      if (filtro !== "todos") params.set("status", filtro);
      return api.get<Paginated<Aprovacao>>(
        `/admin/aprovacoes?${params.toString()}`,
        { signal },
      );
    },
    [filtro],
  );

  const { data, error, loading, refetch } = useApi<Paginated<Aprovacao>>(
    fetcher,
    [filtro],
  );

  async function handleRemover(id: string) {
    if (!confirm("Cancelar esta proposta de aprovação?")) return;
    setErroAcao(null);
    setRemovendo(id);
    try {
      if (isDemo()) {
        setErroAcao("Modo demonstração: ações destrutivas estão desabilitadas.");
      } else {
        await api.delete(`/admin/aprovacoes/${id}`);
        refetch();
      }
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Erro ao remover proposta";
      setErroAcao(msg);
    } finally {
      setRemovendo(null);
    }
  }

  const items = data?.items ?? [];
  const counts = {
    pendente: items.filter((a) => a.status === "pendente").length,
    aprovado: items.filter((a) => a.status === "aprovado").length,
    rejeitado: items.filter((a) => a.status === "rejeitado").length,
  };

  return (
    <AdminShell
      title="Aprovações"
      subtitle={
        data
          ? `${counts.pendente} pendentes · ${counts.aprovado} aprovadas · ${counts.rejeitado} rejeitadas`
          : undefined
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div
            role="tablist"
            aria-label="Filtrar por status"
            className="inline-flex items-center gap-1 rounded-xl border border-ink-200 bg-surface p-1"
          >
            {(["todos", "pendente", "aprovado", "rejeitado"] as FiltroStatus[]).map(
              (s) => {
                const ativo = s === filtro;
                const label =
                  s === "todos" ? "Todas" : STATUS_LABEL[s as StatusAprovacao];
                return (
                  <button
                    key={s}
                    type="button"
                    role="tab"
                    aria-selected={ativo}
                    onClick={() => setFiltro(s)}
                    className={`h-8 rounded-lg px-3 text-sm font-medium transition ${
                      ativo
                        ? "bg-brand-700 text-white"
                        : "text-ink-700 hover:bg-ink-100"
                    }`}
                  >
                    {label}
                  </button>
                );
              },
            )}
          </div>
          <Link href="/admin/aprovacoes/nova">
            <Button>+ Nova proposta</Button>
          </Link>
        </div>

        {erroAcao && (
          <div
            role="alert"
            className="rounded-lg border border-danger-100 bg-danger-100/40 px-3 py-2.5 text-sm text-danger-500"
          >
            {erroAcao}
          </div>
        )}

        {loading ? (
          <LoadingState label="Carregando aprovações…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : items.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-base font-semibold text-ink-950">
              Nenhuma proposta neste filtro
            </p>
            <p className="max-w-sm text-sm text-ink-500">
              Suba uma nova proposta para o cliente revisar.
            </p>
            <Link href="/admin/aprovacoes/nova" className="mt-2">
              <Button size="sm">+ Nova proposta</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {items.map((a) => (
              <Card key={a.id} padded={false} className="overflow-hidden">
                <div className="relative aspect-[4/3] bg-ink-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.url_midia}
                    alt={a.legenda ?? "Proposta"}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute left-3 top-3 flex gap-2">
                    <Badge tone="brand">{TIPO_LABEL[a.tipo]}</Badge>
                    <Badge tone={STATUS_TONE[a.status]}>
                      {STATUS_LABEL[a.status]}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-col gap-3 p-4">
                  <div className="flex items-baseline justify-between gap-3 text-xs text-ink-500">
                    <span className="font-medium text-ink-700">
                      {a.cliente_nome_empresa ?? "—"}
                    </span>
                    <span>{formatRelative(a.created_at)}</span>
                  </div>

                  <p className="line-clamp-3 whitespace-pre-line text-sm text-ink-700">
                    {a.legenda ?? "Sem legenda."}
                  </p>

                  {a.data_agendada && (
                    <p className="text-xs text-ink-500">
                      Agendado para {formatDateTime(a.data_agendada)}
                    </p>
                  )}

                  {a.status === "rejeitado" && a.comentario_revisao && (
                    <div className="rounded-lg border border-danger-100 bg-danger-100/40 px-3 py-2 text-xs text-danger-500">
                      <p className="font-semibold">Cliente rejeitou:</p>
                      <p className="mt-1 whitespace-pre-line">
                        {a.comentario_revisao}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-end pt-1">
                    {a.status === "pendente" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={removendo === a.id}
                        onClick={() => handleRemover(a.id)}
                      >
                        Cancelar proposta
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
