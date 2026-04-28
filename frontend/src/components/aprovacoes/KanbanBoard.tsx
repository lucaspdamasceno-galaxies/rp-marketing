"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import type { Aprovacao, StatusAprovacao } from "@/types/api";

type StageId = "pendente" | "pronto" | "postado";

const STAGES: Array<{
  id: StageId;
  titulo: string;
  hint: string;
  accent: string;
  dot: string;
}> = [
  {
    id: "pendente",
    titulo: "Pendente",
    hint: "aguardando aprovação",
    accent:
      "bg-warning-100/50 border-warning-500/20",
    dot: "bg-warning-500",
  },
  {
    id: "pronto",
    titulo: "Pronto pra postar",
    hint: "texto e arte aprovados",
    accent: "bg-success-100/50 border-success-500/20",
    dot: "bg-success-500",
  },
  {
    id: "postado",
    titulo: "Postado",
    hint: "publicado no Instagram",
    accent: "bg-ink-100/70 border-ink-200",
    dot: "bg-ink-400",
  },
];

function stageOf(a: Aprovacao): StageId {
  if (a.postado_em) return "postado";
  if (a.status_texto === "aprovado" && a.status_arte === "aprovado")
    return "pronto";
  return "pendente";
}

function isRejected(a: Aprovacao): boolean {
  return a.status_texto === "rejeitado" || a.status_arte === "rejeitado";
}

type Props = {
  cards: Aprovacao[];
  role: "admin" | "cliente";
  onCardClick: (a: Aprovacao) => void;
  onChange: () => void;
};

export function KanbanBoard({ cards, role, onCardClick, onChange }: Props) {
  const [movingId, setMovingId] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<StageId | null>(null);

  const rejeitados = cards.filter(isRejected);
  const ativos = cards.filter((c) => !isRejected(c));

  async function moverPara(card: Aprovacao, destino: StageId) {
    if (stageOf(card) === destino) return;

    if (role === "cliente") {
      if (destino === "postado") {
        setErrMsg("Apenas a equipe RP marca como postado.");
        return;
      }
      if (destino === "pendente") {
        setErrMsg("Pra rejeitar, abra o card e use o botão de rejeitar (precisa de comentário).");
        return;
      }
    }

    setMovingId(card.id);
    setErrMsg(null);
    try {
      await aplicarMudanca(card, destino, role);
      onChange();
    } catch (e) {
      setErrMsg(e instanceof ApiError ? e.message : "Erro ao mover card");
    } finally {
      setMovingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {errMsg && (
        <div
          role="alert"
          className="rounded-lg border border-danger-100 bg-danger-100/40 px-3 py-2 text-sm text-danger-500"
        >
          {errMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {STAGES.map((stage) => {
          const lista = ativos.filter((c) => stageOf(c) === stage.id);
          const ativa = dragOver === stage.id;
          return (
            <div
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOver !== stage.id) setDragOver(stage.id);
              }}
              onDragLeave={() => setDragOver((p) => (p === stage.id ? null : p))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const id = e.dataTransfer.getData("text/aprovacao-id");
                const card = cards.find((c) => c.id === id);
                if (card) moverPara(card, stage.id);
              }}
              className={`flex min-h-[180px] flex-col gap-3 rounded-2xl border p-3 transition ${stage.accent} ${
                ativa ? "ring-2 ring-brand-700/30" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${stage.dot}`} />
                  <h2 className="text-sm font-semibold text-ink-950">
                    {stage.titulo}
                  </h2>
                </div>
                <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-ink-700 shadow-sm">
                  {lista.length}
                </span>
              </div>
              <p className="-mt-1 px-1 text-[11px] text-ink-500">{stage.hint}</p>

              <div className="flex flex-col gap-3">
                {lista.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-ink-300 px-3 py-6 text-center text-[11px] text-ink-500">
                    arraste um card aqui
                  </p>
                ) : (
                  lista.map((a) => (
                    <CardItem
                      key={a.id}
                      card={a}
                      moving={movingId === a.id}
                      role={role}
                      onClick={() => onCardClick(a)}
                      onMove={moverPara}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {rejeitados.length > 0 && (
        <div className="rounded-2xl border border-danger-100 bg-danger-100/30 p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-danger-500">
              Rejeitados — precisam de retrabalho
            </h3>
            <span className="text-xs text-danger-500">
              {rejeitados.length} card(s)
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rejeitados.map((a) => (
              <CardItem
                key={a.id}
                card={a}
                moving={movingId === a.id}
                role={role}
                onClick={() => onCardClick(a)}
                onMove={moverPara}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CardItem({
  card,
  moving,
  role,
  onClick,
  onMove,
}: {
  card: Aprovacao;
  moving: boolean;
  role: "admin" | "cliente";
  onClick: () => void;
  onMove: (card: Aprovacao, destino: StageId) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const stage = stageOf(card);
  const proximaAcao = nextStageFor(card, role);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/aprovacao-id", card.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`group relative flex cursor-grab flex-col overflow-hidden rounded-xl border border-ink-200 bg-surface shadow-sm transition active:cursor-grabbing ${
        moving ? "opacity-50" : "hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex flex-1 flex-col text-left"
      >
        {card.midias[0] ? (
          <div className="relative aspect-[4/3] w-full bg-ink-100">
            {card.midias[0].mime_type.startsWith("video/") ? (
              <video
                src={card.midias[0].url}
                className="h-full w-full object-cover"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.midias[0].url}
                alt={card.titulo}
                className="h-full w-full object-cover transition group-hover:scale-[1.02]"
              />
            )}
            {card.midias.length > 1 && (
              <span className="absolute right-2 top-2 rounded-md bg-ink-950/70 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                +{card.midias.length - 1}
              </span>
            )}
          </div>
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-ink-100 to-ink-200/60 text-[11px] font-medium uppercase tracking-wide text-ink-400">
            sem mídia
          </div>
        )}

        <div className="flex flex-1 flex-col gap-2.5 p-3.5">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink-950">
            {card.titulo}
          </h3>

          <div className="flex flex-wrap gap-1.5">
            <StatusChip kind="texto" status={card.status_texto} />
            <StatusChip kind="arte" status={card.status_arte} />
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-ink-100 pt-2.5 text-[11px] text-ink-500">
            <span className="line-clamp-1 font-medium text-ink-700">
              {card.cliente_nome_empresa ?? "—"}
            </span>
            <span className="flex items-center gap-2">
              {card.midias.length > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <IconAttachment />
                  {card.midias.length}
                </span>
              )}
              {card.total_comentarios > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <IconComment />
                  {card.total_comentarios}
                </span>
              )}
              <span>{formatRelative(card.created_at)}</span>
            </span>
          </div>
        </div>
      </button>

      {/* Mobile: botão "Avançar" como alternativa ao drag */}
      {proximaAcao && (
        <div className="border-t border-ink-100 bg-canvas/50 px-3.5 py-2 lg:hidden">
          <button
            type="button"
            onClick={() => onMove(card, proximaAcao.destino)}
            className="w-full rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-800"
          >
            {proximaAcao.label}
          </button>
        </div>
      )}

      {/* Admin: menu de mover */}
      {role === "admin" && (
        <div className="absolute right-2 top-2 hidden lg:block">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="rounded-md bg-ink-950/60 p-1 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:bg-ink-950/80"
            aria-label="Mover para"
          >
            <IconMove />
          </button>
          {showMenu && (
            <div
              className="absolute right-0 top-full mt-1 flex flex-col gap-0.5 rounded-lg border border-ink-200 bg-surface p-1 shadow-lg"
              onMouseLeave={() => setShowMenu(false)}
            >
              {STAGES.filter((s) => s.id !== stage).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onMove(card, s.id);
                  }}
                  className="whitespace-nowrap rounded px-2 py-1 text-left text-xs text-ink-700 hover:bg-ink-100"
                >
                  Mover para {s.titulo}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function nextStageFor(
  card: Aprovacao,
  role: "admin" | "cliente",
): { destino: StageId; label: string } | null {
  const s = stageOf(card);
  if (s === "postado") return null;
  if (s === "pronto") {
    if (role === "admin") return { destino: "postado", label: "Marcar como postado" };
    return null;
  }
  if (role === "cliente") {
    return { destino: "pronto", label: "Aprovar texto e arte" };
  }
  return { destino: "pronto", label: "Marcar como pronto pra postar" };
}

function StatusChip({
  kind,
  status,
}: {
  kind: "texto" | "arte";
  status: StatusAprovacao;
}) {
  const cfg: Record<
    StatusAprovacao,
    { bg: string; fg: string; label: string }
  > = {
    pendente: {
      bg: "bg-warning-100",
      fg: "text-warning-500",
      label: "pendente",
    },
    aprovado: {
      bg: "bg-success-100",
      fg: "text-success-500",
      label: "aprovado",
    },
    rejeitado: {
      bg: "bg-danger-100",
      fg: "text-danger-500",
      label: "rejeitado",
    },
  };
  const c = cfg[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${c.bg} ${c.fg}`}
    >
      <span className="text-ink-500">{kind}</span>
      <span>·</span>
      <span>{c.label}</span>
    </span>
  );
}

function IconAttachment() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
      <path
        d="M9 12V7a3 3 0 1 1 6 0v8a5 5 0 1 1-10 0V8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconComment() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
      <path
        d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconMove() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
      <path
        d="M5 9l-3 3 3 3M9 5l3-3 3 3M19 9l3 3-3 3M9 19l3 3 3-3M2 12h20M12 2v20"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

async function aplicarMudanca(
  card: Aprovacao,
  destino: StageId,
  role: "admin" | "cliente",
) {
  const id = card.id;

  if (destino === "postado") {
    if (
      card.status_texto !== "aprovado" ||
      card.status_arte !== "aprovado"
    ) {
      // admin: sobe pra "pronto" antes
      await api.post(`/admin/aprovacoes/${id}/status`, {
        status_texto: "aprovado",
        status_arte: "aprovado",
      });
    }
    await api.post(`/admin/aprovacoes/${id}/postado`);
    return;
  }

  // Sai de "postado" se for o caso (admin)
  if (card.postado_em) {
    await api.delete(`/admin/aprovacoes/${id}/postado`);
  }

  if (destino === "pendente") {
    if (role === "admin") {
      await api.post(`/admin/aprovacoes/${id}/status`, {
        status_texto: "pendente",
        status_arte: "pendente",
      });
    }
    return;
  }

  if (destino === "pronto") {
    if (role === "admin") {
      await api.post(`/admin/aprovacoes/${id}/status`, {
        status_texto: "aprovado",
        status_arte: "aprovado",
      });
    } else {
      // cliente: aprova trilhos pendentes
      if (card.status_texto === "pendente") {
        await api.post(`/aprovacoes/${id}/aprovar-texto`, { comentario: null });
      }
      if (card.status_arte === "pendente") {
        await api.post(`/aprovacoes/${id}/aprovar-arte`, { comentario: null });
      }
    }
  }
}
