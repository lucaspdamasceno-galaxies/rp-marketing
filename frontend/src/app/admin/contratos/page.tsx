"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { api, ApiError, downloadAutenticado, postFormData } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { formatDate } from "@/lib/format";
import type {
  Cliente,
  Contrato,
  ItemEscopoContrato,
  Paginated,
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

export default function AdminContratosPage() {
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusContrato | "">("");
  const [criarOpen, setCriarOpen] = useState(false);
  const [acaoOpen, setAcaoOpen] = useState<Contrato | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  useEffect(() => {
    api
      .get<Paginated<Cliente>>("/admin/clientes?page_size=100")
      .then((r) => setClientes(r.items))
      .catch(() => setClientes([]));
  }, []);

  const fetcher = useCallback(
    (signal: AbortSignal): Promise<Paginated<Contrato>> => {
      const params = new URLSearchParams({ page_size: "100" });
      if (filtroCliente) params.set("cliente_id", filtroCliente);
      if (filtroStatus) params.set("status", filtroStatus);
      return api.get(`/admin/contratos?${params.toString()}`, { signal });
    },
    [filtroCliente, filtroStatus],
  );
  const { data, error, loading, refetch } = useApi(fetcher, [
    filtroCliente,
    filtroStatus,
  ]);

  return (
    <AdminShell title="Contratos">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <select
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className="h-10 rounded-lg border border-ink-300 bg-surface px-3 text-sm focus:border-accent-500 focus:outline-none"
            >
              <option value="">Todos os clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome_empresa}
                </option>
              ))}
            </select>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as StatusContrato | "")}
              className="h-10 rounded-lg border border-ink-300 bg-surface px-3 text-sm focus:border-accent-500 focus:outline-none"
            >
              <option value="">Todos os status</option>
              <option value="rascunho">Rascunho</option>
              <option value="ativo">Ativo</option>
              <option value="encerrado">Encerrado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <Button onClick={() => setCriarOpen(true)}>+ Novo contrato</Button>
        </div>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (data?.items.length ?? 0) === 0 ? (
          <Card className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-base font-semibold text-ink-950">
              Nenhum contrato
            </p>
            <Button size="sm" onClick={() => setCriarOpen(true)}>
              + Novo contrato
            </Button>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {data!.items.map((c) => (
              <Card key={c.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-ink-950">
                      {c.titulo}
                    </h3>
                    <p className="text-xs text-ink-500">
                      {c.cliente_nome_empresa} ·{" "}
                      {formatDate(c.data_inicio)} → {formatDate(c.data_fim)} ·{" "}
                      {c.duracao_meses} meses
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={STATUS_TONE[c.status]}>
                      {STATUS_LABEL[c.status]}
                    </Badge>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.escopo.map((e) => (
                    <Badge key={e} tone="brand">
                      {ESCOPO_LABELS[e as ItemEscopoContrato] ?? e}
                    </Badge>
                  ))}
                </div>

                {c.valor_mensal && (
                  <p className="mt-2 text-sm text-ink-700">
                    Valor mensal:{" "}
                    <span className="font-medium text-ink-950">
                      {Number(c.valor_mensal).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setAcaoOpen(c)}>
                    Ver / ações
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CriarContratoModal
        open={criarOpen}
        onClose={() => setCriarOpen(false)}
        clientes={clientes}
        onCreated={() => {
          setCriarOpen(false);
          refetch();
        }}
      />
      {acaoOpen && (
        <AcoesContratoModal
          contrato={acaoOpen}
          onClose={() => setAcaoOpen(null)}
          onChange={() => {
            setAcaoOpen(null);
            refetch();
          }}
        />
      )}
    </AdminShell>
  );
}

function CriarContratoModal({
  open,
  onClose,
  clientes,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  clientes: Cliente[];
  onCreated: () => void;
}) {
  const [clienteId, setClienteId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [escopo, setEscopo] = useState<string[]>([]);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [duracao, setDuracao] = useState(6);
  const [dataInicio, setDataInicio] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extraindo, setExtraindo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setClienteId("");
      setTitulo("");
      setEscopo([]);
      setDescricao("");
      setValor("");
      setDuracao(6);
      setDataInicio("");
      setPdfFile(null);
      setErr(null);
      setInfo(null);
    }
  }, [open]);

  function toggleEscopo(item: string) {
    setEscopo((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
    );
  }

  async function extrairDoPdf(file: File) {
    setErr(null);
    setInfo(null);
    setExtraindo(true);
    try {
      const fd = new FormData();
      fd.append("arquivo", file);
      const dados = await postFormData<{
        titulo?: string;
        escopo?: string[];
        valor_mensal?: number;
        duracao_meses?: number;
        data_inicio?: string;
        descricao?: string;
      }>("/admin/contratos/extrair-pdf", fd);

      setPdfFile(file);
      const preenchidos: string[] = [];
      if (dados.titulo) {
        setTitulo(dados.titulo);
        preenchidos.push("título");
      }
      if (dados.escopo && dados.escopo.length > 0) {
        setEscopo(dados.escopo);
        preenchidos.push("escopo");
      }
      if (dados.valor_mensal !== undefined && dados.valor_mensal !== null) {
        setValor(String(dados.valor_mensal));
        preenchidos.push("valor");
      }
      if (dados.duracao_meses) {
        setDuracao(dados.duracao_meses);
        preenchidos.push("duração");
      }
      if (dados.data_inicio) {
        setDataInicio(dados.data_inicio);
        preenchidos.push("data de início");
      }
      if (dados.descricao) {
        setDescricao(dados.descricao);
        preenchidos.push("descrição");
      }
      setInfo(
        preenchidos.length > 0
          ? `Extraído do PDF: ${preenchidos.join(", ")}. Revise e ajuste se precisar.`
          : "PDF anexado, mas não consegui extrair campos automaticamente — preencha à mão.",
      );
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Erro ao extrair PDF");
    } finally {
      setExtraindo(false);
      if (pdfRef.current) pdfRef.current.value = "";
    }
  }

  async function submit() {
    setErr(null);
    if (!clienteId || !titulo.trim() || !dataInicio) {
      setErr("Cliente, título e data de início são obrigatórios.");
      return;
    }
    setBusy(true);
    try {
      const contrato = await api.post<Contrato>("/admin/contratos", {
        cliente_id: clienteId,
        titulo: titulo.trim(),
        escopo,
        descricao: descricao || null,
        valor_mensal: valor ? Number(valor) : null,
        duracao_meses: duracao,
        data_inicio: dataInicio,
      });
      if (pdfFile) {
        const fd = new FormData();
        fd.append("arquivo", pdfFile);
        await postFormData(`/admin/contratos/${contrato.id}/pdf`, fd);
      }
      onCreated();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Erro ao criar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo contrato"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" onClick={submit} loading={busy}>
            Criar rascunho
          </Button>
        </>
      }
    >
      <div className="-mx-6 -my-5 max-h-[70vh] overflow-y-auto px-6 py-5">
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-dashed border-accent-500/40 bg-accent-500/5 p-4">
            <p className="text-sm font-semibold text-ink-950">
              Preencher automaticamente do PDF
            </p>
            <p className="mt-1 text-xs text-ink-500">
              Suba o PDF do contrato e o sistema tenta extrair título, escopo,
              valor, duração e data de início. Você revisa antes de salvar.
            </p>
            <input
              ref={pdfRef}
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) extrairDoPdf(f);
              }}
              className="hidden"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-3"
              onClick={() => pdfRef.current?.click()}
              loading={extraindo}
            >
              {pdfFile ? `PDF anexado: ${pdfFile.name}` : "Selecionar PDF"}
            </Button>
            {info && (
              <p className="mt-2 text-xs text-success-500">{info}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-900">
              Cliente
            </label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="h-11 w-full rounded-lg border border-ink-300 bg-surface px-3 text-[15px] focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
            >
              <option value="">— selecione —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome_empresa}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Título"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Contrato de prestação de serviços — ..."
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-900">
              Escopo (serviços contratados)
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ESCOPO_LABELS) as ItemEscopoContrato[]).map((k) => {
                const ativo = escopo.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleEscopo(k)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      ativo
                        ? "bg-brand-700 text-white"
                        : "bg-ink-100 text-ink-700 hover:bg-ink-200"
                    }`}
                  >
                    {ESCOPO_LABELS[k]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Valor mensal (R$, opcional)"
              type="number"
              min="0"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
            <Input
              label="Duração (meses)"
              type="number"
              min="1"
              max="120"
              value={duracao}
              onChange={(e) => setDuracao(Number(e.target.value || 1))}
            />
          </div>

          <Input
            label="Data de início"
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-900">
              Descrição / cláusulas extras
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-ink-300 bg-surface p-3 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
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
      </div>
    </Modal>
  );
}

function AcoesContratoModal({
  contrato,
  onClose,
  onChange,
}: {
  contrato: Contrato;
  onClose: () => void;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [assinadoEm, setAssinadoEm] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handle(fn: () => Promise<void>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      onChange();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function uploadPdf(file: File) {
    await handle(async () => {
      const fd = new FormData();
      fd.append("arquivo", file);
      await postFormData(`/admin/contratos/${contrato.id}/pdf`, fd);
    });
  }

  async function ativar() {
    await handle(async () => {
      await api.post(`/admin/contratos/${contrato.id}/ativar`, {
        assinado_em_externo: assinadoEm || null,
      });
    });
  }

  async function cancelar() {
    const motivo = prompt("Motivo do cancelamento (opcional):") ?? "";
    await handle(async () => {
      await api.post(`/admin/contratos/${contrato.id}/cancelar`, {
        motivo: motivo || null,
      });
    });
  }

  async function remover() {
    if (!confirm("Remover este rascunho?")) return;
    await handle(async () => {
      await api.delete(`/admin/contratos/${contrato.id}`);
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Ações — ${contrato.titulo}`}
      footer={
        <Button variant="ghost" size="sm" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-ink-200 px-3 py-2 text-xs text-ink-700">
          Status atual:{" "}
          <Badge tone={STATUS_TONE[contrato.status]}>
            {STATUS_LABEL[contrato.status]}
          </Badge>
        </div>

        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold text-ink-950">
            1) Anexar PDF assinado pelo cliente
          </h4>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadPdf(f);
            }}
            className="block w-full text-sm text-ink-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-700 file:px-3 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-brand-800"
          />
          {contrato.pdf_url && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-200 bg-canvas/50 p-3">
              <span className="text-xs text-ink-700">
                PDF anexado:{" "}
                <span className="font-medium text-ink-950">
                  {contrato.pdf_nome_original ?? "contrato.pdf"}
                </span>
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  try {
                    await downloadAutenticado(
                      `/admin/contratos/${contrato.id}/download`,
                      contrato.pdf_nome_original ?? "contrato.pdf",
                    );
                  } catch (e) {
                    setErr(e instanceof ApiError ? e.message : "Erro ao baixar");
                  }
                }}
              >
                Baixar PDF
              </Button>
            </div>
          )}
        </div>

        {contrato.status === "rascunho" && (
          <div className="flex flex-col gap-2 border-t border-ink-200 pt-4">
            <h4 className="text-sm font-semibold text-ink-950">
              2) Ativar o contrato
            </h4>
            <Input
              label="Data em que cliente assinou (opcional)"
              type="date"
              value={assinadoEm}
              onChange={(e) => setAssinadoEm(e.target.value)}
            />
            <Button onClick={ativar} loading={busy} disabled={!contrato.pdf_url}>
              Marcar como ativo
            </Button>
            {!contrato.pdf_url && (
              <p className="text-xs text-ink-500">
                Anexe o PDF antes de ativar.
              </p>
            )}
          </div>
        )}

        {contrato.status !== "cancelado" && contrato.status !== "encerrado" && (
          <div className="flex flex-col gap-2 border-t border-ink-200 pt-4">
            <Button variant="danger" size="sm" onClick={cancelar} loading={busy}>
              Cancelar contrato
            </Button>
          </div>
        )}

        {contrato.status === "rascunho" && (
          <div className="flex flex-col gap-2 border-t border-ink-200 pt-4">
            <Button variant="ghost" size="sm" onClick={remover} loading={busy}>
              Remover rascunho
            </Button>
          </div>
        )}

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
