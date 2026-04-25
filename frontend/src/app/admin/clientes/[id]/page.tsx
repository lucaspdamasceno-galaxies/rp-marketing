"use client";

import { FormEvent, use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { isDemo } from "@/lib/demo";
import { findCliente } from "@/lib/mock";
import { formatDate } from "@/lib/format";
import type { Cliente, SyncInstagramResponse } from "@/types/api";

export default function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const fetcher = useCallback(
    (signal: AbortSignal) => {
      if (isDemo()) {
        const c = findCliente(id);
        return c
          ? Promise.resolve(c)
          : Promise.reject(new ApiError("Cliente não encontrado", 404));
      }
      return api.get<Cliente>(`/admin/clientes/${id}`, { signal });
    },
    [id],
  );
  const { data: cliente, error, loading, refetch } = useApi<Cliente>(fetcher, [
    id,
  ]);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [salvo, setSalvo] = useState<string | null>(null);

  useEffect(() => {
    if (!cliente) return;
    setNome(cliente.nome);
    setEmail(cliente.email);
    setNomeEmpresa(cliente.nome_empresa);
    setAtivo(cliente.ativo);
    setNovaSenha("");
  }, [cliente]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!cliente) return;
    setActionError(null);
    setSalvo(null);
    setActionLoading(true);
    try {
      const body: Record<string, unknown> = {
        nome,
        email,
        nome_empresa: nomeEmpresa,
        ativo,
      };
      if (novaSenha.trim()) body.senha = novaSenha;
      await api.put<Cliente>(`/admin/clientes/${cliente.id}`, body);
      setSalvo("Alterações salvas com sucesso.");
      setNovaSenha("");
      refetch();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Erro ao salvar cliente";
      setActionError(message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSync() {
    if (!cliente) return;
    setActionError(null);
    setSalvo(null);
    setActionLoading(true);
    try {
      const data = await api.post<SyncInstagramResponse>(
        `/admin/instagram/sync/${cliente.id}`,
      );
      setSalvo(
        data.postagens_novas > 0
          ? `Sincronizado — ${data.postagens_novas} nova${data.postagens_novas > 1 ? "s" : ""} postage${data.postagens_novas > 1 ? "ns" : "m"} adicionada${data.postagens_novas > 1 ? "s" : ""}.`
          : "Sincronizado — nenhuma postagem nova.",
      );
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Erro ao sincronizar";
      setActionError(message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemover() {
    if (!cliente) return;
    if (!confirm("Remover este cliente?")) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await api.delete(`/admin/clientes/${cliente.id}`);
      router.replace("/admin/clientes");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Erro ao remover cliente";
      setActionError(message);
      setActionLoading(false);
    }
  }

  return (
    <AdminShell
      title={cliente?.nome_empresa ?? "Cliente"}
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

        {loading ? (
          <LoadingState label="Carregando cliente…" />
        ) : error || !cliente ? (
          <ErrorState message={error ?? "Cliente não encontrado."} onRetry={refetch} />
        ) : (
          <>
            <Card>
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <h2 className="text-lg font-semibold text-ink-950">
                    Dados do cliente
                  </h2>
                  <p className="text-sm text-ink-500">
                    Cadastrado em {formatDate(cliente.created_at)}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Nome do responsável"
                    name="nome"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    disabled={actionLoading}
                  />
                  <Input
                    label="Nome da empresa"
                    name="nome_empresa"
                    required
                    value={nomeEmpresa}
                    onChange={(e) => setNomeEmpresa(e.target.value)}
                    disabled={actionLoading}
                  />
                  <Input
                    label="Email"
                    type="email"
                    name="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={actionLoading}
                  />
                  <Input
                    label="Nova senha"
                    type="password"
                    name="senha"
                    autoComplete="new-password"
                    placeholder="Deixe em branco para manter"
                    hint="Mínimo de 8 caracteres se for alterar"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    disabled={actionLoading}
                  />
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="text-sm font-medium text-ink-900">
                      Status
                    </span>
                    <label className="inline-flex h-11 w-fit items-center gap-2 rounded-lg border border-ink-300 bg-surface px-3.5 text-sm">
                      <input
                        type="checkbox"
                        checked={ativo}
                        onChange={(e) => setAtivo(e.target.checked)}
                        disabled={actionLoading}
                        className="h-4 w-4 accent-accent-500"
                      />
                      Cliente ativo
                    </label>
                  </div>
                </div>

                {actionError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-danger-100 bg-danger-100/40 px-3 py-2.5 text-sm text-danger-500"
                  >
                    {actionError}
                  </div>
                )}

                {salvo && !actionError && (
                  <div
                    role="status"
                    className="rounded-lg border border-success-100 bg-success-100/40 px-3 py-2.5 text-sm text-success-500"
                  >
                    {salvo}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-ink-200 pt-5">
                  <Button
                    type="button"
                    variant="danger"
                    onClick={handleRemover}
                    disabled={actionLoading}
                  >
                    Remover cliente
                  </Button>
                  <Button type="submit" loading={actionLoading}>
                    Salvar alterações
                  </Button>
                </div>
              </form>
            </Card>

            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-ink-950">
                    Instagram
                  </h2>
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
                    <Link
                      href={`/admin/conectar-instagram?cliente=${cliente.id}`}
                    >
                      <Button variant="secondary" size="sm">
                        {cliente.instagram_conectado
                          ? "Reconectar"
                          : "Conectar"}
                      </Button>
                    </Link>
                    {cliente.instagram_conectado && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSync}
                        disabled={actionLoading}
                      >
                        Sincronizar agora
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </AdminShell>
  );
}
