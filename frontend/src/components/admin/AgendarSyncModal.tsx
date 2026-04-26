"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { api, ApiError } from "@/lib/api";
import type { Cliente, SyncScheduleResponse } from "@/types/api";

type Preset = { label: string; cron: string };

const PRESETS: Preset[] = [
  { label: "A cada hora", cron: "0 * * * *" },
  { label: "A cada 6 horas", cron: "0 */6 * * *" },
  { label: "Diário às 06:00", cron: "0 6 * * *" },
  { label: "Diário às 12:00", cron: "0 12 * * *" },
  { label: "Semanal (segunda 08:00)", cron: "0 8 * * 1" },
];

type Props = {
  cliente: Cliente | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function AgendarSyncModal({ cliente, open, onClose, onSaved }: Props) {
  const [cron, setCron] = useState("");
  const [loading, setLoading] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (open && cliente) {
      setCron(cliente.sync_cron ?? "0 6 * * *");
      setErro(null);
    }
  }, [open, cliente]);

  if (!cliente) return null;

  async function salvar() {
    if (!cliente) return;
    setLoading(true);
    setErro(null);
    try {
      await api.post<SyncScheduleResponse>(
        `/admin/instagram/schedule/${cliente.id}`,
        { cron: cron.trim() },
      );
      onSaved();
      onClose();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao agendar");
    } finally {
      setLoading(false);
    }
  }

  async function remover() {
    if (!cliente) return;
    if (!confirm("Remover o agendamento desse cliente?")) return;
    setRemovendo(true);
    setErro(null);
    try {
      await api.delete(`/admin/instagram/schedule/${cliente.id}`);
      onSaved();
      onClose();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao remover");
    } finally {
      setRemovendo(false);
    }
  }

  const tem_agendamento = !!cliente.sync_cron;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Agendar sync — ${cliente.nome_empresa}`}
      footer={
        <>
          {tem_agendamento && (
            <Button
              variant="danger"
              size="sm"
              loading={removendo}
              onClick={remover}
            >
              Remover agendamento
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button size="sm" onClick={salvar} loading={loading}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-sm text-ink-700">
            Escolha uma frequência ou informe uma expressão{" "}
            <a
              href="https://crontab.guru"
              target="_blank"
              rel="noreferrer"
              className="text-accent-700 underline"
            >
              cron
            </a>{" "}
            customizada (5 campos: <code>m h dom mon dow</code>). O fuso é{" "}
            <b>America/Sao_Paulo</b>.
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
            Presets
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.cron}
                type="button"
                onClick={() => setCron(p.cron)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  cron === p.cron
                    ? "border-accent-500 bg-accent-50 text-accent-700"
                    : "border-ink-200 bg-surface text-ink-700 hover:border-ink-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="cron"
            className="text-xs font-semibold uppercase tracking-wide text-ink-500"
          >
            Cron expression
          </label>
          <Input
            id="cron"
            name="cron"
            value={cron}
            onChange={(e) => setCron(e.target.value)}
            placeholder="0 6 * * *"
          />
          <p className="text-xs text-ink-500">
            Atual: <code className="text-ink-700">{cron || "—"}</code>
          </p>
        </div>

        {erro && (
          <div
            role="alert"
            className="rounded-lg border border-danger-100 bg-danger-100/40 px-3 py-2.5 text-sm text-danger-500"
          >
            {erro}
          </div>
        )}

        {tem_agendamento && (
          <div className="rounded-lg border border-ink-200 bg-ink-50/60 px-3 py-2.5 text-xs text-ink-500">
            Agendamento atual: <b>{cliente.sync_cron}</b>
          </div>
        )}
      </div>
    </Modal>
  );
}
