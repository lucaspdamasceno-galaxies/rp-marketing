"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { LoadingState } from "@/components/ui/States";
import { api, ApiError, postFormData } from "@/lib/api";
import { formatDateTime, formatRelative } from "@/lib/format";
import type {
  AprovacaoComentario,
  AprovacaoDetail,
  AprovacaoMidia,
  StatusAprovacao,
} from "@/types/api";

type Props = {
  open: boolean;
  onClose: () => void;
  aprovacaoId: string | null;
  role: "admin" | "cliente";
  onChange?: () => void;
};

export function AprovacaoDetailModal({
  open,
  onClose,
  aprovacaoId,
  role,
  onChange,
}: Props) {
  const [data, setData] = useState<AprovacaoDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [enviandoMsg, setEnviandoMsg] = useState(false);
  const [midiaIdx, setMidiaIdx] = useState(0);
  const fileRefMidias = useRef<HTMLInputElement>(null);

  const basePath = role === "admin" ? "/admin/aprovacoes" : "/aprovacoes";

  const refresh = useCallback(async () => {
    if (!aprovacaoId) return;
    setLoading(true);
    setErrMsg(null);
    try {
      const res = await api.get<AprovacaoDetail>(`${basePath}/${aprovacaoId}`);
      setData(res);
      setMidiaIdx((prev) => Math.min(prev, Math.max(0, res.midias.length - 1)));
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [aprovacaoId, basePath]);

  useEffect(() => {
    if (open) refresh();
    else {
      setData(null);
      setMidiaIdx(0);
    }
  }, [open, refresh]);

  async function handleAction(fn: () => Promise<void>) {
    setActing(true);
    setErrMsg(null);
    try {
      await fn();
      await refresh();
      onChange?.();
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "Erro");
    } finally {
      setActing(false);
    }
  }

  async function aprovarTexto() {
    await handleAction(() =>
      api.post(`/aprovacoes/${aprovacaoId}/aprovar-texto`, { comentario: null }),
    );
  }
  async function rejeitarTexto() {
    const c = window.prompt("Por que rejeitar o texto? (obrigatório)");
    if (!c) return;
    await handleAction(() =>
      api.post(`/aprovacoes/${aprovacaoId}/rejeitar-texto`, { comentario: c }),
    );
  }
  async function aprovarArte() {
    await handleAction(() =>
      api.post(`/aprovacoes/${aprovacaoId}/aprovar-arte`, { comentario: null }),
    );
  }
  async function rejeitarArte() {
    const c = window.prompt("Por que rejeitar a arte? (obrigatório)");
    if (!c) return;
    await handleAction(() =>
      api.post(`/aprovacoes/${aprovacaoId}/rejeitar-arte`, { comentario: c }),
    );
  }
  async function marcarPostado() {
    await handleAction(() =>
      api.post(`/admin/aprovacoes/${aprovacaoId}/postado`),
    );
  }
  async function desfazerPostado() {
    await handleAction(() =>
      api.delete(`/admin/aprovacoes/${aprovacaoId}/postado`),
    );
  }
  async function adminSetarStatus(
    field: "status_texto" | "status_arte",
    novo: StatusAprovacao,
  ) {
    await handleAction(() =>
      api.post(`/admin/aprovacoes/${aprovacaoId}/status`, { [field]: novo }),
    );
  }
  async function excluirCard() {
    if (!confirm("Excluir este card definitivamente?")) return;
    setActing(true);
    setErrMsg(null);
    try {
      await api.delete(`/admin/aprovacoes/${aprovacaoId}`);
      onChange?.();
      onClose();
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "Erro ao excluir");
    } finally {
      setActing(false);
    }
  }

  async function uploadMidias(files: FileList | null) {
    if (!files || files.length === 0 || !aprovacaoId) return;
    setActing(true);
    setErrMsg(null);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("arquivos", f));
      await postFormData(`/admin/aprovacoes/${aprovacaoId}/midias`, fd);
      await refresh();
      onChange?.();
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "Erro ao subir mídia");
    } finally {
      setActing(false);
      if (fileRefMidias.current) fileRefMidias.current.value = "";
    }
  }
  async function removerMidia(midia: AprovacaoMidia) {
    if (!confirm(`Remover ${midia.nome_original}?`)) return;
    await handleAction(() =>
      api.delete(`/admin/aprovacoes/${aprovacaoId}/midias/${midia.id}`),
    );
  }

  async function enviarComentario() {
    if (!novaMensagem.trim() || !aprovacaoId) return;
    setEnviandoMsg(true);
    setErrMsg(null);
    try {
      await api.post<AprovacaoComentario>(
        `/aprovacoes/${aprovacaoId}/comentarios`,
        { mensagem: novaMensagem.trim() },
      );
      setNovaMensagem("");
      await refresh();
      onChange?.();
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : "Erro ao comentar");
    } finally {
      setEnviandoMsg(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={data?.titulo ?? "Card"}
      footer={
        <Button variant="ghost" size="sm" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <div className="-mx-6 -my-5 max-h-[85vh] overflow-y-auto px-6 py-5">
        {loading || !data ? (
          <LoadingState />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr,1fr]">
            {/* COLUNA PRINCIPAL */}
            <div className="flex flex-col gap-5">
              {/* Galeria de mídias */}
              <div className="flex flex-col gap-2">
                {data.midias.length > 0 ? (
                  <>
                    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-ink-100">
                      {data.midias[midiaIdx]?.mime_type.startsWith("video/") ? (
                        <video
                          src={data.midias[midiaIdx].url}
                          controls
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={data.midias[midiaIdx]?.url}
                          alt={data.midias[midiaIdx]?.nome_original}
                          className="h-full w-full object-contain"
                        />
                      )}
                      {role === "admin" && data.midias[midiaIdx] && (
                        <button
                          type="button"
                          onClick={() => removerMidia(data.midias[midiaIdx])}
                          className="absolute right-2 top-2 rounded-full bg-ink-950/70 px-2 py-1 text-[10px] font-medium text-white hover:bg-ink-950"
                          disabled={acting}
                        >
                          Remover
                        </button>
                      )}
                      {data.midias.length > 1 && (
                        <span className="absolute bottom-2 left-2 rounded-md bg-ink-950/70 px-2 py-0.5 text-[11px] text-white">
                          {midiaIdx + 1} / {data.midias.length}
                        </span>
                      )}
                    </div>
                    {data.midias.length > 1 && (
                      <div className="flex gap-1.5 overflow-x-auto">
                        {data.midias.map((m, i) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setMidiaIdx(i)}
                            className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 transition ${
                              i === midiaIdx
                                ? "border-brand-700"
                                : "border-transparent opacity-60 hover:opacity-100"
                            }`}
                          >
                            {m.mime_type.startsWith("video/") ? (
                              <video
                                src={m.url}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={m.url}
                                alt={m.nome_original}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-ink-300 bg-ink-100/50 text-sm text-ink-500">
                    Nenhuma mídia ainda
                  </div>
                )}

                {role === "admin" && (
                  <>
                    <input
                      ref={fileRefMidias}
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={(e) => uploadMidias(e.target.files)}
                      className="hidden"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fileRefMidias.current?.click()}
                      loading={acting}
                    >
                      + Adicionar mídia
                    </Button>
                  </>
                )}
              </div>

              {/* Descrição */}
              <div>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Descrição / legenda
                </h3>
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">
                  {data.legenda ?? (
                    <span className="text-ink-400">— sem descrição —</span>
                  )}
                </p>
              </div>

              {/* Metadados */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ink-100 pt-4 text-[11px] text-ink-500">
                <span>
                  Cliente:{" "}
                  <span className="font-medium text-ink-700">
                    {data.cliente_nome_empresa ?? "—"}
                  </span>
                </span>
                <span>
                  Tipo: <span className="font-medium text-ink-700">{data.tipo}</span>
                </span>
                {data.data_agendada && (
                  <span>
                    Agendado para:{" "}
                    <span className="font-medium text-ink-700">
                      {formatDateTime(data.data_agendada)}
                    </span>
                  </span>
                )}
                <span>Criado {formatRelative(data.created_at)}</span>
              </div>
            </div>

            {/* COLUNA LATERAL: STATUS + AÇÕES + COMENTÁRIOS */}
            <div className="flex flex-col gap-5 lg:border-l lg:border-ink-100 lg:pl-6">
              {/* Status atual */}
              <div className="rounded-xl border border-ink-200 bg-canvas/50 p-3">
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Status
                </h3>
                <div className="flex flex-col gap-1.5">
                  <StatusRow label="Texto" status={data.status_texto} />
                  <StatusRow label="Arte" status={data.status_arte} />
                  {data.postado_em && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-500">Publicação</span>
                      <span className="rounded-md bg-success-100 px-2 py-0.5 text-[11px] font-medium text-success-500">
                        Postado
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Ações cliente */}
              {role === "cliente" && !data.postado_em && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                    Sua decisão
                  </h3>
                  {data.status_texto === "pendente" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={aprovarTexto}
                        loading={acting}
                        className="flex-1"
                      >
                        Aprovar texto
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={rejeitarTexto}
                        loading={acting}
                      >
                        Rejeitar
                      </Button>
                    </div>
                  )}
                  {data.status_arte === "pendente" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={aprovarArte}
                        loading={acting}
                        className="flex-1"
                      >
                        Aprovar arte
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={rejeitarArte}
                        loading={acting}
                      >
                        Rejeitar
                      </Button>
                    </div>
                  )}
                  {data.status_texto !== "pendente" &&
                    data.status_arte !== "pendente" && (
                      <p className="text-xs text-ink-500">
                        Texto e arte já foram decididos. Aguardando a equipe RP
                        postar.
                      </p>
                    )}
                </div>
              )}

              {/* Ações admin */}
              {role === "admin" && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                    Ações do admin
                  </h3>
                  <AdminStatusRow
                    label="Texto"
                    atual={data.status_texto}
                    onChange={(s) => adminSetarStatus("status_texto", s)}
                    disabled={acting}
                  />
                  <AdminStatusRow
                    label="Arte"
                    atual={data.status_arte}
                    onChange={(s) => adminSetarStatus("status_arte", s)}
                    disabled={acting}
                  />
                  <div className="flex flex-wrap gap-2 pt-1">
                    {data.postado_em ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={desfazerPostado}
                        loading={acting}
                      >
                        Desfazer postagem
                      </Button>
                    ) : data.status_texto === "aprovado" &&
                      data.status_arte === "aprovado" ? (
                      <Button size="sm" onClick={marcarPostado} loading={acting}>
                        Marcar como postado
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={excluirCard}
                      loading={acting}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              )}

              {/* Comentários */}
              <div className="flex flex-col gap-2">
                <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Atividade
                  {data.comentarios.length > 0 && (
                    <span className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] text-ink-700">
                      {data.comentarios.length}
                    </span>
                  )}
                </h3>
                <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-1">
                  {data.comentarios.length === 0 ? (
                    <p className="text-xs text-ink-500">Sem comentários ainda.</p>
                  ) : (
                    data.comentarios.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-lg bg-canvas px-3 py-2"
                      >
                        <div className="flex items-baseline justify-between gap-2 text-[11px]">
                          <span className="font-semibold text-ink-950">
                            {c.autor_nome ?? "—"}
                          </span>
                          <span className="text-ink-500">
                            {formatRelative(c.created_at)}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-700">
                          {c.mensagem}
                        </p>
                        {c.anexos_urls.length > 0 && (
                          <div className="mt-2 grid grid-cols-3 gap-1.5">
                            {c.anexos_urls.map((u) => (
                              <a
                                key={u}
                                href={u}
                                target="_blank"
                                rel="noreferrer"
                                className="aspect-square overflow-hidden rounded bg-ink-100"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={u}
                                  alt="anexo"
                                  className="h-full w-full object-cover"
                                />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <div className="flex flex-col gap-2 border-t border-ink-100 pt-3">
                  <textarea
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    rows={2}
                    placeholder="Escrever um comentário..."
                    className="w-full resize-y rounded-lg border border-ink-300 bg-surface p-2.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                  />
                  <Button
                    size="sm"
                    onClick={enviarComentario}
                    loading={enviandoMsg}
                    disabled={!novaMensagem.trim()}
                  >
                    Enviar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {errMsg && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-danger-100 bg-danger-100/40 px-3 py-2 text-sm text-danger-500"
          >
            {errMsg}
          </div>
        )}
      </div>
    </Modal>
  );
}

function StatusRow({
  label,
  status,
}: {
  label: string;
  status: StatusAprovacao;
}) {
  const cfg: Record<StatusAprovacao, { txt: string; bg: string; fg: string }> = {
    pendente: {
      txt: "Pendente",
      bg: "bg-warning-100",
      fg: "text-warning-500",
    },
    aprovado: {
      txt: "Aprovado",
      bg: "bg-success-100",
      fg: "text-success-500",
    },
    rejeitado: {
      txt: "Rejeitado",
      bg: "bg-danger-100",
      fg: "text-danger-500",
    },
  };
  const c = cfg[status];
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-ink-500">{label}</span>
      <span
        className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${c.bg} ${c.fg}`}
      >
        {c.txt}
      </span>
    </div>
  );
}

function AdminStatusRow({
  label,
  atual,
  onChange,
  disabled,
}: {
  label: string;
  atual: StatusAprovacao;
  onChange: (s: StatusAprovacao) => void;
  disabled?: boolean;
}) {
  const opts: Array<{ v: StatusAprovacao; label: string }> = [
    { v: "pendente", label: "Pendente" },
    { v: "aprovado", label: "Aprovar" },
    { v: "rejeitado", label: "Rejeitar" },
  ];
  return (
    <div>
      <p className="mb-1 text-xs text-ink-500">{label}</p>
      <div className="flex gap-1">
        {opts.map((o) => {
          const active = atual === o.v;
          return (
            <button
              key={o.v}
              type="button"
              disabled={disabled || active}
              onClick={() => onChange(o.v)}
              className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition disabled:cursor-not-allowed ${
                active
                  ? "bg-brand-700 text-white"
                  : "bg-ink-100 text-ink-700 hover:bg-ink-200"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
