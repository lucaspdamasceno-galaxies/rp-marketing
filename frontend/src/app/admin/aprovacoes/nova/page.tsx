"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { isDemo } from "@/lib/demo";
import { mockClientes } from "@/lib/mock";
import type { Cliente, Paginated, TipoPostagem } from "@/types/api";

const TIPOS: { value: TipoPostagem; label: string }[] = [
  { value: "IMAGE", label: "Imagem" },
  { value: "REEL", label: "Reel" },
  { value: "CAROUSEL", label: "Carrossel" },
  { value: "VIDEO", label: "Vídeo" },
];

export default function NovaAprovacaoPage() {
  const router = useRouter();

  const [clienteId, setClienteId] = useState("");
  const [tipo, setTipo] = useState<TipoPostagem>("IMAGE");
  const [urlMidia, setUrlMidia] = useState("");
  const [legenda, setLegenda] = useState("");
  const [dataAgendada, setDataAgendada] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetcherClientes = (signal: AbortSignal) =>
    isDemo()
      ? Promise.resolve({
          items: mockClientes,
          total: mockClientes.length,
          page: 1,
          page_size: mockClientes.length,
        })
      : api.get<Paginated<Cliente>>(
          "/admin/clientes?page_size=100",
          { signal },
        );
  const { data: clientesPag } = useApi<Paginated<Cliente>>(fetcherClientes, []);
  const clientes = clientesPag?.items ?? [];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!clienteId) {
      setError("Selecione um cliente.");
      return;
    }
    if (!urlMidia.trim()) {
      setError("Informe a URL da mídia.");
      return;
    }
    setLoading(true);
    try {
      if (isDemo()) {
        await new Promise((r) => setTimeout(r, 500));
      } else {
        await api.post("/admin/aprovacoes", {
          cliente_id: clienteId,
          tipo,
          url_midia: urlMidia.trim(),
          legenda: legenda.trim() || null,
          data_agendada: dataAgendada
            ? new Date(dataAgendada).toISOString()
            : null,
        });
      }
      router.replace("/admin/aprovacoes");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Erro ao criar proposta";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell
      title="Nova proposta"
      subtitle="Suba uma postagem para o cliente revisar e aprovar"
    >
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/admin/aprovacoes"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-950"
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
          Voltar
        </Link>

        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label
                  htmlFor="cliente"
                  className="text-sm font-medium text-ink-900"
                >
                  Cliente
                </label>
                <select
                  id="cliente"
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 rounded-lg border border-ink-300 bg-surface px-3.5 text-[15px] text-ink-950 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
                >
                  <option value="">Selecione um cliente…</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome_empresa}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="tipo"
                  className="text-sm font-medium text-ink-900"
                >
                  Tipo de postagem
                </label>
                <select
                  id="tipo"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoPostagem)}
                  disabled={loading}
                  className="h-11 rounded-lg border border-ink-300 bg-surface px-3.5 text-[15px] text-ink-950 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
                >
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Data agendada (opcional)"
                type="datetime-local"
                name="data_agendada"
                value={dataAgendada}
                onChange={(e) => setDataAgendada(e.target.value)}
                disabled={loading}
              />

              <div className="sm:col-span-2">
                <Input
                  label="URL da mídia"
                  type="url"
                  name="url_midia"
                  required
                  placeholder="https://..."
                  hint="Cole o link da imagem ou vídeo (Drive, Dropbox, S3, etc.)"
                  value={urlMidia}
                  onChange={(e) => setUrlMidia(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label
                  htmlFor="legenda"
                  className="text-sm font-medium text-ink-900"
                >
                  Legenda sugerida
                </label>
                <textarea
                  id="legenda"
                  rows={6}
                  placeholder="Texto que vai acompanhar a postagem…"
                  value={legenda}
                  onChange={(e) => setLegenda(e.target.value)}
                  disabled={loading}
                  className="rounded-lg border border-ink-300 bg-surface px-3.5 py-2.5 text-[15px] text-ink-950 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
                />
              </div>
            </div>

            {urlMidia.trim() && (
              <div className="rounded-xl border border-ink-200 bg-ink-50/60 p-3">
                <p className="mb-2 text-xs font-medium text-ink-500">
                  Preview da mídia
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={urlMidia}
                  alt="Preview"
                  className="max-h-64 w-auto rounded-lg object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-danger-100 bg-danger-100/40 px-3 py-2.5 text-sm text-danger-500"
              >
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-ink-200 pt-5">
              <Link href="/admin/aprovacoes">
                <Button type="button" variant="ghost" disabled={loading}>
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" loading={loading}>
                Enviar para aprovação
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AdminShell>
  );
}
