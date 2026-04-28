"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { api, ApiError, postFormData } from "@/lib/api";
import type { Aprovacao, Cliente, Paginated, TipoPostagem } from "@/types/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  clientePreSelecionado?: string;
};

const TIPOS: { value: TipoPostagem; label: string }[] = [
  { value: "IMAGE", label: "Imagem" },
  { value: "CAROUSEL", label: "Carrossel" },
  { value: "VIDEO", label: "Vídeo" },
  { value: "REEL", label: "Reel" },
];

export function CriarAprovacaoModal({
  open,
  onClose,
  onCreated,
  clientePreSelecionado,
}: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState<string>(
    clientePreSelecionado ?? "",
  );
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TipoPostagem>("IMAGE");
  const [legenda, setLegenda] = useState("");
  const [dataAgendada, setDataAgendada] = useState("");
  const [arquivos, setArquivos] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setClienteId(clientePreSelecionado ?? "");
    setTitulo("");
    setLegenda("");
    setDataAgendada("");
    setArquivos(null);
    setErr(null);
    api
      .get<Paginated<Cliente>>("/admin/clientes?page_size=100")
      .then((res) => setClientes(res.items))
      .catch(() => setClientes([]));
  }, [open, clientePreSelecionado]);

  async function submit() {
    setErr(null);
    if (!clienteId || !titulo.trim()) {
      setErr("Cliente e título são obrigatórios.");
      return;
    }
    setSubmitting(true);
    try {
      const aprovacao = await api.post<Aprovacao>("/admin/aprovacoes", {
        cliente_id: clienteId,
        titulo: titulo.trim(),
        tipo,
        legenda: legenda.trim() || null,
        data_agendada: dataAgendada || null,
      });
      if (arquivos && arquivos.length > 0) {
        const fd = new FormData();
        Array.from(arquivos).forEach((f) => fd.append("arquivos", f));
        await postFormData(
          `/admin/aprovacoes/${aprovacao.id}/midias`,
          fd,
        );
      }
      onCreated();
      onClose();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Erro ao criar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo card de aprovação"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" onClick={submit} loading={submitting}>
            Criar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
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
          label="Título do card"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: Não deixe o cliente levar o básico..."
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-900">
            Tipo
          </label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoPostagem)}
            className="h-11 w-full rounded-lg border border-ink-300 bg-surface px-3 text-[15px] focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-900">
            Descrição / legenda
          </label>
          <textarea
            value={legenda}
            onChange={(e) => setLegenda(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-ink-300 bg-surface p-3 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
            placeholder="Texto que vai virar a legenda do post"
          />
        </div>

        <Input
          label="Data agendada (opcional)"
          type="datetime-local"
          value={dataAgendada}
          onChange={(e) => setDataAgendada(e.target.value)}
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-900">
            Mídias (uma ou várias)
          </label>
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={(e) => setArquivos(e.target.files)}
            className="block w-full text-sm text-ink-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-700 file:px-3 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-brand-800"
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
