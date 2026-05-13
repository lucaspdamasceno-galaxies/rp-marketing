"use client";

import { use, useCallback, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { formatDate, formatNumber } from "@/lib/format";
import type {
  CampoCustomizado,
  Cliente,
  MetricasMensais,
} from "@/types/api";

const NUMERICOS: { key: keyof MetricasMensais; label: string }[] = [
  { key: "seguidores", label: "Seguidores" },
  { key: "curtidas", label: "Curtidas" },
  { key: "comentarios", label: "Comentários" },
  { key: "compartilhamentos", label: "Compartilhamentos" },
  { key: "visualizacoes", label: "Visualizações" },
  { key: "alcance", label: "Alcance" },
];

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function primeiroDiaDoMesISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

type CampoCustomizadoForm = { chave: string; valor: number };

type FormState = {
  data_inicio: string;
  data_fim: string;
  seguidores: number;
  curtidas: number;
  comentarios: number;
  compartilhamentos: number;
  visualizacoes: number;
  alcance: number;
  observacoes: string;
  campos_customizados: CampoCustomizadoForm[];
};

function formularioVazio(): FormState {
  return {
    data_inicio: primeiroDiaDoMesISO(),
    data_fim: hojeISO(),
    seguidores: 0,
    curtidas: 0,
    comentarios: 0,
    compartilhamentos: 0,
    visualizacoes: 0,
    alcance: 0,
    observacoes: "",
    campos_customizados: [],
  };
}

export default function AdminMetricasMensaisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(() => formularioVazio());
  const [salvando, setSalvando] = useState(false);
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const fetcherCliente = useCallback(
    (signal: AbortSignal) =>
      api.get<Cliente>(`/admin/clientes/${id}`, { signal }),
    [id],
  );
  const { data: cliente } = useApi<Cliente>(fetcherCliente, [id]);

  const fetcherMetricas = useCallback(
    (signal: AbortSignal) =>
      api.get<MetricasMensais[]>(
        `/admin/metricas-mensais/cliente/${id}?ordem=desc`,
        { signal },
      ),
    [id],
  );
  const {
    data: metricas,
    loading,
    error,
    refetch,
  } = useApi<MetricasMensais[]>(fetcherMetricas, [id]);

  function carregarParaEdicao(m: MetricasMensais) {
    setEditandoId(m.id);
    setForm({
      data_inicio: m.data_inicio,
      data_fim: m.data_fim,
      seguidores: m.seguidores,
      curtidas: m.curtidas,
      comentarios: m.comentarios,
      compartilhamentos: m.compartilhamentos,
      visualizacoes: m.visualizacoes,
      alcance: m.alcance,
      observacoes: m.observacoes ?? "",
      campos_customizados: (m.campos_customizados ?? []).map((c) => ({
        chave: c.chave,
        valor: c.valor,
      })),
    });
    setErroAcao(null);
    setSucesso(null);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function novoRegistro() {
    setEditandoId(null);
    setForm(formularioVazio());
    setErroAcao(null);
    setSucesso(null);
  }

  function setNumerico(k: string, v: string) {
    const n = v === "" ? 0 : Number(v);
    setForm((prev) => ({ ...prev, [k]: Number.isFinite(n) ? n : 0 }));
  }

  function adicionarCampoCustomizado() {
    setForm((prev) => ({
      ...prev,
      campos_customizados: [
        ...prev.campos_customizados,
        { chave: "", valor: 0 },
      ],
    }));
  }

  function atualizarCampoCustomizado(
    index: number,
    field: "chave" | "valor",
    value: string,
  ) {
    setForm((prev) => {
      const novos = [...prev.campos_customizados];
      const item = { ...novos[index] };
      if (field === "valor") {
        const n = Number(value);
        item.valor = Number.isFinite(n) ? n : 0;
      } else {
        item.chave = value;
      }
      novos[index] = item;
      return { ...prev, campos_customizados: novos };
    });
  }

  function removerCampoCustomizado(index: number) {
    setForm((prev) => ({
      ...prev,
      campos_customizados: prev.campos_customizados.filter((_, i) => i !== index),
    }));
  }

  async function salvar() {
    setSalvando(true);
    setErroAcao(null);
    setSucesso(null);
    try {
      const payload = {
        cliente_id: id,
        data_inicio: form.data_inicio,
        data_fim: form.data_fim,
        seguidores: form.seguidores,
        curtidas: form.curtidas,
        comentarios: form.comentarios,
        compartilhamentos: form.compartilhamentos,
        visualizacoes: form.visualizacoes,
        alcance: form.alcance,
        observacoes: form.observacoes || null,
        campos_customizados: form.campos_customizados
          .filter((c) => c.chave.trim())
          .map((c) => ({
            chave: c.chave.trim(),
            label: c.chave.trim(),
            valor: c.valor,
          })),
      };

      if (editandoId) {
        await api.put<MetricasMensais>(
          `/admin/metricas-mensais/${editandoId}`,
          payload,
        );
        setSucesso("Métricas atualizadas");
      } else {
        await api.post<MetricasMensais>("/admin/metricas-mensais", payload);
        setSucesso("Métricas registradas");
      }
      novoRegistro();
      refetch();
    } catch (err) {
      setErroAcao(err instanceof ApiError ? err.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function remover(metricaId: string) {
    if (!confirm("Remover este registro?")) return;
    setRemovendoId(metricaId);
    setErroAcao(null);
    try {
      await api.delete(`/admin/metricas-mensais/${metricaId}`);
      if (editandoId === metricaId) novoRegistro();
      refetch();
    } catch (err) {
      setErroAcao(err instanceof ApiError ? err.message : "Erro ao remover");
    } finally {
      setRemovendoId(null);
    }
  }

  return (
    <AdminShell
      title="Métricas mensais"
      subtitle={
        cliente
          ? `${cliente.nome_empresa} — entradas mensais para o dashboard`
          : undefined
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin/clientes"
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
            Voltar para clientes
          </Link>
          {editandoId && (
            <Button variant="ghost" size="sm" onClick={novoRegistro}>
              Cancelar edição → novo registro
            </Button>
          )}
        </div>

        {erroAcao && (
          <div
            role="alert"
            className="rounded-lg border border-danger-100 bg-danger-100/40 px-3 py-2.5 text-sm text-danger-500"
          >
            {erroAcao}
          </div>
        )}
        {sucesso && (
          <div
            role="status"
            className="rounded-lg border border-success-100 bg-success-100/40 px-3 py-2.5 text-sm text-success-500"
          >
            {sucesso}
          </div>
        )}

        <Card className="flex flex-col gap-5">
          <div>
            <h2 className="text-base font-semibold text-ink-950">
              {editandoId ? "Editar registro" : "Novo registro"}
            </h2>
            <p className="text-xs text-ink-500">
              Cada registro vale para o range [data início → data fim]. O
              dashboard do cliente usa esses números quando o período
              consultado sobrepõe algum registro.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Data início
              </label>
              <Input
                type="date"
                value={form.data_inicio}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, data_inicio: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Data fim
              </label>
              <Input
                type="date"
                value={form.data_fim}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, data_fim: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {NUMERICOS.map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-xs text-ink-500">{label}</label>
                <Input
                  type="number"
                  min="0"
                  value={String(form[key as keyof typeof form] ?? 0)}
                  onChange={(e) => setNumerico(key as string, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Campos customizados
              </p>
              <Button
                size="sm"
                variant="secondary"
                type="button"
                onClick={adicionarCampoCustomizado}
              >
                + Adicionar campo
              </Button>
            </div>
            {form.campos_customizados.length === 0 ? (
              <p className="text-xs text-ink-400">
                Nenhum campo customizado. Use para métricas extras (ex.: ROI,
                Stories views).
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {form.campos_customizados.map((c, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-1 gap-2 rounded-lg border border-ink-200 bg-canvas p-3 sm:grid-cols-12"
                  >
                    <div className="sm:col-span-7">
                      <Input
                        placeholder="Chave (ex.: ROI Tráfego, CPA)"
                        value={c.chave}
                        onChange={(e) =>
                          atualizarCampoCustomizado(i, "chave", e.target.value)
                        }
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <Input
                        type="number"
                        placeholder="Valor"
                        value={String(c.valor)}
                        onChange={(e) =>
                          atualizarCampoCustomizado(i, "valor", e.target.value)
                        }
                      />
                    </div>
                    <div className="sm:col-span-1 sm:flex sm:items-stretch">
                      <button
                        type="button"
                        onClick={() => removerCampoCustomizado(i)}
                        className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-danger-100 text-xs font-semibold text-danger-500 hover:bg-danger-100/70"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Observações
            </label>
            <textarea
              value={form.observacoes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, observacoes: e.target.value }))
              }
              rows={3}
              maxLength={4000}
              className="rounded-lg border border-ink-200 bg-surface px-3 py-2 text-sm text-ink-950 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
              placeholder="Notas internas sobre o período (opcional)"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={salvar} loading={salvando}>
              {editandoId ? "Salvar alterações" : "Registrar"}
            </Button>
          </div>
        </Card>

        <div>
          <h2 className="mb-3 text-base font-semibold text-ink-950">
            Histórico ({metricas?.length ?? 0})
          </h2>
          {loading ? (
            <LoadingState label="Carregando histórico…" />
          ) : error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : !metricas || metricas.length === 0 ? (
            <Card className="py-10 text-center text-sm text-ink-500">
              Nenhum registro cadastrado.
            </Card>
          ) : (
            <Card padded={false} className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-ink-200 bg-ink-50/60 text-xs font-semibold uppercase tracking-wide text-ink-500">
                    <tr>
                      <th className="px-4 py-3">Período</th>
                      <th className="px-4 py-3 text-right">Seguidores</th>
                      <th className="px-4 py-3 text-right">Curtidas</th>
                      <th className="px-4 py-3 text-right">Coment.</th>
                      <th className="px-4 py-3 text-right">Alcance</th>
                      <th className="px-4 py-3 text-right">Custom</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-200">
                    {metricas.map((m) => (
                      <tr key={m.id}>
                        <td className="px-4 py-3 font-medium text-ink-950">
                          {formatDate(m.data_inicio)} – {formatDate(m.data_fim)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatNumber(m.seguidores)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatNumber(m.curtidas)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatNumber(m.comentarios)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatNumber(m.alcance)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-ink-500">
                          {m.campos_customizados?.length ?? 0}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => carregarParaEdicao(m)}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              loading={removendoId === m.id}
                              onClick={() => remover(m.id)}
                            >
                              Remover
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
