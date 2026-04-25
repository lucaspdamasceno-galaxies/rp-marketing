"use client";

import { useCallback, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
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

export default function ClienteAprovacoesPage() {
  const [filtro, setFiltro] = useState<FiltroStatus>("todos");

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
        `/aprovacoes?${params.toString()}`,
        { signal },
      );
    },
    [filtro],
  );

  const { data, error, loading, refetch } = useApi<Paginated<Aprovacao>>(
    fetcher,
    [filtro],
  );

  const items = data?.items ?? [];

  return (
    <AppShell
      title="Aprovações"
      subtitle="Revise as postagens propostas pela equipe RP"
    >
      <div className="flex flex-col gap-6">
        <div
          role="tablist"
          aria-label="Filtrar por status"
          className="inline-flex w-fit items-center gap-1 rounded-xl border border-ink-200 bg-surface p-1"
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

        {loading ? (
          <LoadingState label="Carregando aprovações…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : items.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-base font-semibold text-ink-950">
              Nenhuma aprovação por aqui
            </p>
            <p className="max-w-sm text-sm text-ink-500">
              Quando a equipe RP subir uma proposta de postagem, ela aparece
              nesta tela para você revisar.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {items.map((a) => (
              <AprovacaoCard
                key={a.id}
                aprovacao={a}
                onChange={refetch}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function AprovacaoCard({
  aprovacao,
  onChange,
}: {
  aprovacao: Aprovacao;
  onChange: () => void;
}) {
  const [comentario, setComentario] = useState("");
  const [acao, setAcao] = useState<"aprovar" | "rejeitar" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function executar(novaAcao: "aprovar" | "rejeitar") {
    setErro(null);
    if (novaAcao === "rejeitar" && !comentario.trim()) {
      setErro("Comentário obrigatório para rejeitar.");
      return;
    }
    setLoading(true);
    try {
      if (isDemo()) {
        // simula sucesso sem persistir
        await new Promise((r) => setTimeout(r, 400));
      } else {
        await api.post(`/aprovacoes/${aprovacao.id}/${novaAcao}`, {
          comentario: comentario.trim() || null,
        });
      }
      onChange();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Erro ao registrar decisão";
      setErro(msg);
    } finally {
      setLoading(false);
      setAcao(null);
    }
  }

  return (
    <Card padded={false} className="flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] bg-ink-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={aprovacao.url_midia}
          alt={aprovacao.legenda ?? "Proposta"}
          className="h-full w-full object-cover"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          <Badge tone="brand">{TIPO_LABEL[aprovacao.tipo]}</Badge>
          <Badge tone={STATUS_TONE[aprovacao.status]}>
            {STATUS_LABEL[aprovacao.status]}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-baseline justify-between gap-3 text-xs text-ink-500">
          <span>Proposto por {aprovacao.admin_nome ?? "RP Marketing"}</span>
          <span>{formatRelative(aprovacao.created_at)}</span>
        </div>

        <p className="line-clamp-4 whitespace-pre-line text-sm text-ink-900">
          {aprovacao.legenda ?? "Sem legenda."}
        </p>

        {aprovacao.data_agendada && (
          <p className="text-xs text-ink-500">
            Agendado para{" "}
            <span className="font-medium text-ink-700">
              {formatDateTime(aprovacao.data_agendada)}
            </span>
          </p>
        )}

        {aprovacao.status !== "pendente" && aprovacao.comentario_revisao && (
          <div className="rounded-lg border border-ink-200 bg-ink-50/60 px-3 py-2 text-sm text-ink-700">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              Seu comentário
            </p>
            <p className="mt-1 whitespace-pre-line">
              {aprovacao.comentario_revisao}
            </p>
          </div>
        )}

        {aprovacao.status === "pendente" && (
          <>
            {(acao === "rejeitar" || acao === "aprovar") && (
              <textarea
                placeholder={
                  acao === "rejeitar"
                    ? "Conta o que precisa mudar (obrigatório)"
                    : "Comentário opcional"
                }
                rows={3}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                disabled={loading}
                className="rounded-lg border border-ink-300 bg-surface px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
              />
            )}

            {erro && (
              <div
                role="alert"
                className="rounded-lg border border-danger-100 bg-danger-100/40 px-3 py-2 text-xs text-danger-500"
              >
                {erro}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              {acao ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAcao(null);
                      setComentario("");
                      setErro(null);
                    }}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant={acao === "rejeitar" ? "danger" : "primary"}
                    size="sm"
                    loading={loading}
                    onClick={() => executar(acao)}
                  >
                    {acao === "rejeitar" ? "Confirmar rejeição" : "Confirmar"}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => setAcao("rejeitar")}
                    disabled={loading}
                  >
                    Rejeitar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setAcao("aprovar")}
                    disabled={loading}
                  >
                    Aprovar
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
