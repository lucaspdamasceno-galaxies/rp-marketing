"use client";

import { useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { KanbanBoard } from "@/components/aprovacoes/KanbanBoard";
import { AprovacaoDetailModal } from "@/components/aprovacoes/AprovacaoDetailModal";
import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import type { Aprovacao, Paginated } from "@/types/api";

export default function ClienteAprovacoesPage() {
  const [detailId, setDetailId] = useState<string | null>(null);

  const fetcher = useCallback(
    (signal: AbortSignal): Promise<Paginated<Aprovacao>> =>
      api.get<Paginated<Aprovacao>>(`/aprovacoes?page_size=100`, { signal }),
    [],
  );
  const { data, error, loading, refetch } = useApi<Paginated<Aprovacao>>(
    fetcher,
    [],
  );
  const cards = data?.items ?? [];

  return (
    <AppShell
      title="Aprovações"
      subtitle="Arraste o card pro próximo estágio pra aprovar. Pra rejeitar, abra o card e use o botão de rejeitar (precisa de comentário)."
    >
      {loading ? (
        <LoadingState label="Carregando aprovações…" />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : cards.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <p className="text-base font-semibold text-ink-950">
            Nenhum card por aqui
          </p>
          <p className="max-w-sm text-sm text-ink-500">
            Quando a RP propuser uma postagem, ela aparece aqui pra você revisar
            texto e arte.
          </p>
        </Card>
      ) : (
        <KanbanBoard
          cards={cards}
          role="cliente"
          onCardClick={(a) => setDetailId(a.id)}
          onChange={refetch}
        />
      )}

      <AprovacaoDetailModal
        open={!!detailId}
        onClose={() => setDetailId(null)}
        aprovacaoId={detailId}
        role="cliente"
        onChange={refetch}
      />
    </AppShell>
  );
}
