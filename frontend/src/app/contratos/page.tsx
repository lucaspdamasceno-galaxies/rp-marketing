"use client";

import { useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useState } from "react";
import { api, ApiError, downloadAutenticado } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { formatDate } from "@/lib/format";
import type {
  Contrato,
  ItemEscopoContrato,
  StatusContrato,
} from "@/types/api";

const ESCOPO_LABELS: Record<ItemEscopoContrato, string> = {
  trafego_pago: "Tráfego pago",
  gestao_redes_sociais: "Gestão de redes sociais",
  producao_conteudo: "Produção de conteúdo",
  branding: "Branding",
  site: "Site",
  consultoria: "Consultoria",
};

const STATUS_TONE: Record<StatusContrato, "warning" | "success" | "neutral" | "danger"> = {
  rascunho: "warning",
  ativo: "success",
  encerrado: "neutral",
  cancelado: "danger",
};

const STATUS_LABEL: Record<StatusContrato, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
};

function DownloadContratoBox({
  contratoId,
  role,
  nome,
}: {
  contratoId: string;
  role: "admin" | "cliente";
  nome: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function baixar() {
    setBusy(true);
    setErr(null);
    try {
      const path =
        role === "admin"
          ? `/admin/contratos/${contratoId}/download`
          : `/contratos/${contratoId}/download`;
      await downloadAutenticado(path, nome ?? "contrato.pdf");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Erro ao baixar PDF");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-2 rounded-xl border border-ink-200 bg-canvas/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path
                d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M14 3v5h5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-ink-950">
              {nome ?? "contrato.pdf"}
            </p>
            <p className="text-xs text-ink-500">
              Documento privado — disponível apenas para você
            </p>
          </div>
        </div>
        <Button size="sm" onClick={baixar} loading={busy}>
          Baixar PDF
        </Button>
      </div>
      {err && (
        <div
          role="alert"
          className="rounded-lg border border-danger-100 bg-danger-100/40 px-3 py-2 text-xs text-danger-500"
        >
          {err}
        </div>
      )}
    </div>
  );
}

export default function ClienteContratosPage() {
  const fetcher = useCallback(
    (signal: AbortSignal): Promise<Contrato[]> =>
      api.get(`/contratos`, { signal }),
    [],
  );
  const { data, error, loading, refetch } = useApi(fetcher, []);

  return (
    <AppShell
      title="Meus contratos"
      subtitle="Vigência, escopo e documentos assinados"
    >
      <div className="flex flex-col gap-6">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (data?.length ?? 0) === 0 ? (
          <Card className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-base font-semibold text-ink-950">
              Nenhum contrato disponível
            </p>
            <p className="max-w-sm text-sm text-ink-500">
              Quando um contrato for ativado pela RP, aparece aqui.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {data!.map((c) => (
              <Card key={c.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-ink-950">
                      {c.titulo}
                    </h3>
                    <p className="text-xs text-ink-500">
                      Vigência: {formatDate(c.data_inicio)} →{" "}
                      {formatDate(c.data_fim)} ({c.duracao_meses} meses)
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[c.status]}>
                    {STATUS_LABEL[c.status]}
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.escopo.map((e) => (
                    <Badge key={e} tone="brand">
                      {ESCOPO_LABELS[e as ItemEscopoContrato] ?? e}
                    </Badge>
                  ))}
                </div>

                {c.valor_mensal && (
                  <p className="mt-3 text-sm text-ink-700">
                    Valor mensal:{" "}
                    <span className="font-medium text-ink-950">
                      {Number(c.valor_mensal).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </p>
                )}

                {c.descricao && (
                  <p className="mt-3 whitespace-pre-line text-sm text-ink-700">
                    {c.descricao}
                  </p>
                )}

                {c.assinado_em_externo && (
                  <p className="mt-3 text-xs text-ink-500">
                    Assinado em {formatDate(c.assinado_em_externo)}
                  </p>
                )}

                {c.cancelado_em && (
                  <div className="mt-3 rounded-lg border border-danger-100 bg-danger-100/40 px-3 py-2 text-xs text-danger-500">
                    <p className="font-semibold">
                      Cancelado em {formatDate(c.cancelado_em)}
                    </p>
                    {c.motivo_cancelamento && (
                      <p className="mt-1">{c.motivo_cancelamento}</p>
                    )}
                  </div>
                )}

                {c.pdf_url && (
                  <DownloadContratoBox
                    contratoId={c.id}
                    role="cliente"
                    nome={c.pdf_nome_original}
                  />
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
