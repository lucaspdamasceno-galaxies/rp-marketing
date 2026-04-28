"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { TrafegoDashboard } from "@/components/trafego/TrafegoDashboard";
import { api, ApiError, postFormData } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { formatDate } from "@/lib/format";
import type { Cliente, Paginated, RelatorioTrafego } from "@/types/api";

export default function AdminTrafegoPage() {
  const [clienteId, setClienteId] = useState<string | null>(null);

  if (clienteId) {
    return (
      <DashboardCliente
        clienteId={clienteId}
        onBack={() => setClienteId(null)}
      />
    );
  }
  return <ListaClientes onSelect={setClienteId} />;
}

// ===================== LISTA DE CLIENTES (LANDING) =====================

function ListaClientes({ onSelect }: { onSelect: (id: string) => void }) {
  const fetchClientes = useCallback(
    (signal: AbortSignal): Promise<Paginated<Cliente>> =>
      api.get(`/admin/clientes?page_size=100`, { signal }),
    [],
  );
  const fetchTodos = useCallback(
    (signal: AbortSignal): Promise<Paginated<RelatorioTrafego>> =>
      api.get(`/admin/relatorios-trafego?page_size=100`, { signal }),
    [],
  );

  const clientes = useApi(fetchClientes, []);
  const relatorios = useApi(fetchTodos, []);

  // Conta relatórios por cliente
  const counts = useMemo(() => {
    const m = new Map<string, { count: number; ultimo: string | null }>();
    for (const r of relatorios.data?.items ?? []) {
      const cur = m.get(r.cliente_id) ?? { count: 0, ultimo: null };
      cur.count += 1;
      if (!cur.ultimo || r.periodo_fim > cur.ultimo) cur.ultimo = r.periodo_fim;
      m.set(r.cliente_id, cur);
    }
    return m;
  }, [relatorios.data]);

  const lista = clientes.data?.items ?? [];

  return (
    <AdminShell
      title="Tráfego pago"
      subtitle="Selecione um cliente para abrir o dashboard"
    >
      {clientes.loading || relatorios.loading ? (
        <LoadingState />
      ) : clientes.error ? (
        <ErrorState message={clientes.error} onRetry={clientes.refetch} />
      ) : lista.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-base font-semibold text-ink-950">
            Sem clientes cadastrados ainda
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {lista.map((c) => {
            const stats = counts.get(c.id) ?? { count: 0, ultimo: null };
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                className="group flex flex-col gap-3 rounded-2xl border border-ink-200 bg-surface p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-700/40 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                      <path
                        d="M4 19V9m6 10V5m6 14v-7m6 7V11"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-700">
                    {stats.count} relatório{stats.count === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="line-clamp-2 text-base font-semibold leading-snug text-ink-950">
                    {c.nome_empresa}
                  </h3>
                  <p className="line-clamp-1 text-xs text-ink-500">{c.email}</p>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-ink-100 pt-3 text-[11px] text-ink-500">
                  <span>
                    {stats.ultimo
                      ? `Último: ${formatDate(stats.ultimo)}`
                      : "Sem relatórios"}
                  </span>
                  <span className="font-medium text-brand-700 transition group-hover:translate-x-0.5">
                    Abrir →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}

// ===================== DASHBOARD DO CLIENTE =====================

function DashboardCliente({
  clienteId,
  onBack,
}: {
  clienteId: string;
  onBack: () => void;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [cliente, setCliente] = useState<Cliente | null>(null);

  useEffect(() => {
    api
      .get<Cliente>(`/admin/clientes/${clienteId}`)
      .then(setCliente)
      .catch(() => setCliente(null));
  }, [clienteId]);

  const fetcher = useCallback(
    (signal: AbortSignal): Promise<Paginated<RelatorioTrafego>> =>
      api.get(
        `/admin/relatorios-trafego?cliente_id=${clienteId}&page_size=100`,
        { signal },
      ),
    [clienteId],
  );
  const { data, error, loading, refetch } = useApi<Paginated<RelatorioTrafego>>(
    fetcher,
    [clienteId],
  );

  const relatoriosCron = useMemo(() => {
    return [...(data?.items ?? [])].sort((a, b) =>
      a.periodo_inicio.localeCompare(b.periodo_inicio),
    );
  }, [data]);

  return (
    <AdminShell
      title={cliente?.nome_empresa ?? "Tráfego pago"}
      subtitle="Dashboard de tráfego pago"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
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
            Voltar para todos os clientes
          </button>
          <Button onClick={() => setUploadOpen(true)}>+ Subir PDF</Button>
        </div>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : relatoriosCron.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-base font-semibold text-ink-950">
              Nenhum relatório ainda
            </p>
            <p className="max-w-sm text-sm text-ink-500">
              Suba o PDF do Reportei (Google Ads + Meta Ads). O sistema parseia
              os números e monta o dashboard automaticamente.
            </p>
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              + Subir PDF
            </Button>
          </Card>
        ) : (
          <TrafegoDashboard
            relatorios={relatoriosCron}
            onRemoverRelatorio={async (id) => {
              await api.delete(`/admin/relatorios-trafego/${id}`);
              refetch();
            }}
          />
        )}
      </div>

      <UploadPdfModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        clienteId={clienteId}
        onUploaded={() => {
          setUploadOpen(false);
          refetch();
        }}
      />
    </AdminShell>
  );
}

function UploadPdfModal({
  open,
  onClose,
  clienteId,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  clienteId: string;
  onUploaded: () => void;
}) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setArquivo(null);
      setPeriodoInicio("");
      setPeriodoFim("");
      setErr(null);
    }
  }, [open]);

  async function submit() {
    setErr(null);
    if (!arquivo) {
      setErr("Selecione o PDF.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("cliente_id", clienteId);
      fd.append("arquivo", arquivo);
      if (periodoInicio) fd.append("periodo_inicio", periodoInicio);
      if (periodoFim) fd.append("periodo_fim", periodoFim);
      await postFormData("/admin/relatorios-trafego", fd);
      onUploaded();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Erro ao subir");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Subir relatório PDF"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" onClick={submit} loading={busy}>
            Subir
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-900">
            PDF
          </label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-ink-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-700 file:px-3 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-brand-800"
          />
          <p className="mt-1 text-xs text-ink-500">
            O sistema parseia automaticamente. Se o período não for detectado,
            preencha abaixo.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Período início (opcional)"
            type="date"
            value={periodoInicio}
            onChange={(e) => setPeriodoInicio(e.target.value)}
          />
          <Input
            label="Período fim (opcional)"
            type="date"
            value={periodoFim}
            onChange={(e) => setPeriodoFim(e.target.value)}
          />
        </div>
        {err && (
          <div
            role="alert"
            className="rounded-lg border border-danger-100 bg-danger-100/40 px-3 py-2 text-sm text-danger-500"
          >
            {err}
          </div>
        )}
      </div>
    </Modal>
  );
}
