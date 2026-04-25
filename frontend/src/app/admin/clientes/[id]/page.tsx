"use client";

import { FormEvent, use, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api";
import { findCliente } from "@/lib/mock";
import { formatDate } from "@/lib/format";
import type { Cliente } from "@/types/api";

export default function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const cliente = findCliente(id);
  if (!cliente) notFound();

  const router = useRouter();
  const [nomeEmpresa, setNomeEmpresa] = useState(cliente.nome_empresa);
  const [ativo, setAtivo] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSalvo(false);
    setLoading(true);
    try {
      await api.put<Cliente>(`/admin/clientes/${id}`, {
        nome_empresa: nomeEmpresa,
        ativo,
      });
      setSalvo(true);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Erro ao salvar cliente";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setError(null);
    setLoading(true);
    try {
      await api.post(`/admin/instagram/sync/${id}`);
      setSalvo(true);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Erro ao sincronizar";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemover() {
    if (!confirm("Remover este cliente?")) return;
    setLoading(true);
    try {
      await api.delete(`/admin/clientes/${id}`);
      router.replace("/admin/clientes");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Erro ao remover cliente";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <AdminShell
      title={cliente.nome_empresa}
      subtitle="Editar dados do cliente"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
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
          Voltar para a lista
        </Link>

        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-semibold text-ink-950">
                Dados da empresa
              </h2>
              <p className="text-sm text-ink-500">
                Cadastrado em {formatDate(cliente.created_at)}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Nome da empresa"
                name="nome_empresa"
                required
                value={nomeEmpresa}
                onChange={(e) => setNomeEmpresa(e.target.value)}
                disabled={loading}
              />
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ink-900">Status</span>
                <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-ink-300 bg-surface px-3.5 text-sm">
                  <input
                    type="checkbox"
                    checked={ativo}
                    onChange={(e) => setAtivo(e.target.checked)}
                    disabled={loading}
                    className="h-4 w-4 accent-accent-500"
                  />
                  Cliente ativo
                </label>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-danger-100 bg-danger-100/40 px-3 py-2.5 text-sm text-danger-500"
              >
                {error}
              </div>
            )}

            {salvo && !error && (
              <div
                role="status"
                className="rounded-lg border border-success-100 bg-success-100/40 px-3 py-2.5 text-sm text-success-500"
              >
                Alterações salvas com sucesso.
              </div>
            )}

            <div className="flex items-center justify-between border-t border-ink-200 pt-5">
              <Button
                type="button"
                variant="danger"
                onClick={handleRemover}
                disabled={loading}
              >
                Remover cliente
              </Button>
              <Button type="submit" loading={loading}>
                Salvar alterações
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink-950">Instagram</h2>
              <p className="mt-1 text-sm text-ink-500">
                {cliente.instagram_conectado
                  ? `Conta conectada · ID ${cliente.instagram_account_id}`
                  : "Nenhuma conta conectada ainda."}
              </p>
              {cliente.token_expires_at && (
                <p className="mt-1 text-xs text-ink-500">
                  Token expira em {formatDate(cliente.token_expires_at)}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {cliente.instagram_conectado ? (
                <Badge tone="success">Conectado</Badge>
              ) : (
                <Badge tone="warning">Pendente</Badge>
              )}
              <div className="flex gap-2">
                <Link href={`/admin/conectar-instagram?cliente=${cliente.id}`}>
                  <Button variant="secondary" size="sm">
                    {cliente.instagram_conectado ? "Reconectar" : "Conectar"}
                  </Button>
                </Link>
                {cliente.instagram_conectado && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSync}
                    disabled={loading}
                  >
                    Sincronizar agora
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
