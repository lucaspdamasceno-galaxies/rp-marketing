"use client";

import { use, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { isDemo } from "@/lib/demo";
import { findPostagem } from "@/lib/mock";
import {
  formatCompact,
  formatDateTime,
  formatNumber,
} from "@/lib/format";
import type { Postagem, TipoPostagem } from "@/types/api";

const TIPO_LABEL: Record<TipoPostagem, string> = {
  IMAGE: "Imagem",
  VIDEO: "Vídeo",
  CAROUSEL: "Carrossel",
  REEL: "Reel",
};

export default function PostagemDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const fetcher = useCallback(
    (signal: AbortSignal) => {
      if (isDemo()) {
        const p = findPostagem(id);
        return p
          ? Promise.resolve(p)
          : Promise.reject(new ApiError("Postagem não encontrada", 404));
      }
      return api.get<Postagem>(`/postagens/${id}`, { signal });
    },
    [id],
  );
  const { data: postagem, error, loading, refetch } = useApi<Postagem>(
    fetcher,
    [id],
  );

  return (
    <AppShell title="Detalhe da postagem">
      <div className="flex flex-col gap-6">
        <Link
          href="/postagens"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-950"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path
              d="m14 18-6-6 6-6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Voltar para postagens
        </Link>

        {loading ? (
          <LoadingState label="Carregando postagem…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : postagem ? (
          <Detalhes postagem={postagem} />
        ) : null}
      </div>
    </AppShell>
  );
}

function Detalhes({ postagem }: { postagem: Postagem }) {
  const taxaEngajamento =
    postagem.alcance > 0
      ? ((postagem.curtidas + postagem.comentarios) / postagem.alcance) * 100
      : 0;

  const isVideo = postagem.tipo === "VIDEO" || postagem.tipo === "REEL";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <Card padded={false} className="overflow-hidden lg:col-span-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={postagem.url_midia}
          alt={postagem.legenda ?? "Postagem"}
          className="aspect-square w-full object-cover"
        />
      </Card>

      <div className="flex flex-col gap-6 lg:col-span-3">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge tone="brand">{TIPO_LABEL[postagem.tipo]}</Badge>
              <p className="mt-3 text-sm text-ink-500">
                Publicado em {formatDateTime(postagem.data_publicacao)}
              </p>
              {postagem.permalink && (
                <a
                  href={postagem.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs font-medium text-brand-700 hover:underline"
                >
                  Abrir no Instagram ↗
                </a>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                Engajamento
              </p>
              <p className="text-2xl font-semibold tabular-nums text-ink-950">
                {taxaEngajamento.toFixed(1)}%
              </p>
            </div>
          </div>
          <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-ink-900">
            {postagem.legenda ?? "Sem legenda."}
          </p>
        </Card>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Curtidas" value={postagem.curtidas} />
          <Stat label="Comentários" value={postagem.comentarios} />
          <Stat label="Alcance" value={postagem.alcance} />
          <Stat label="Impressões" value={postagem.impressoes} />
          {isVideo && (
            <Stat label="Visualizações" value={postagem.visualizacoes} />
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-ink-950">
        {formatCompact(value)}
      </p>
      <p className="mt-1 text-xs text-ink-500 tabular-nums">
        {hint ?? formatNumber(value)}
      </p>
    </Card>
  );
}
