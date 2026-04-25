"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { formatDate } from "@/lib/format";
import type { Cliente, Paginated } from "@/types/api";

export default function AdminClientesPage() {
  const [busca, setBusca] = useState("");
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  const fetcher = useCallback(
    (signal: AbortSignal) => {
      const params = new URLSearchParams({ page_size: "50" });
      if (busca.trim()) params.set("q", busca.trim());
      return api.get<Paginated<Cliente>>(
        `/admin/clientes?${params.toString()}`,
        { signal },
      );
    },
    [busca],
  );

  const { data, error, loading, refetch } = useApi<Paginated<Cliente>>(
    fetcher,
    [busca],
  );

  async function handleRemover(id: string) {
    if (!confirm("Remover este cliente? Essa ação não pode ser desfeita.")) {
      return;
    }
    setErroAcao(null);
    setRemovendo(id);
    try {
      await api.delete(`/admin/clientes/${id}`);
      refetch();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Erro ao remover cliente";
      setErroAcao(message);
    } finally {
      setRemovendo(null);
    }
  }

  const items = data?.items ?? [];

  return (
    <AdminShell
      title="Clientes"
      subtitle={data ? `${data.total} clientes cadastrados` : undefined}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="w-full max-w-sm">
            <Input
              type="search"
              name="busca"
              placeholder="Buscar por nome, email ou empresa…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Link href="/admin/clientes/novo">
            <Button>+ Novo cliente</Button>
          </Link>
        </div>

        {erroAcao && (
          <div
            role="alert"
            className="rounded-lg border border-danger-100 bg-danger-100/40 px-3 py-2.5 text-sm text-danger-500"
          >
            {erroAcao}
          </div>
        )}

        {loading ? (
          <LoadingState label="Carregando clientes…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : items.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-base font-semibold text-ink-950">
              Nenhum cliente encontrado
            </p>
            <p className="max-w-sm text-sm text-ink-500">
              Ajuste a busca ou cadastre um novo cliente para começar.
            </p>
          </Card>
        ) : (
          <Card padded={false} className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="border-b border-ink-200 bg-ink-50/60 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-6 py-3">Empresa</th>
                    <th className="px-6 py-3">Responsável</th>
                    <th className="px-6 py-3">Instagram</th>
                    <th className="px-6 py-3">Cadastrado em</th>
                    <th className="px-6 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {items.map((c) => (
                    <tr key={c.id} className="text-sm">
                      <td className="px-6 py-4">
                        <p className="font-medium text-ink-950">
                          {c.nome_empresa}
                        </p>
                        {!c.ativo && (
                          <Badge tone="warning" className="mt-1">
                            Inativo
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-ink-950">{c.nome}</p>
                        <p className="text-xs text-ink-500">{c.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        {c.instagram_conectado ? (
                          <Badge tone="success">Conectado</Badge>
                        ) : (
                          <Badge tone="warning">Pendente</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-ink-700 tabular-nums">
                        {formatDate(c.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/clientes/${c.id}`}>
                            <Button variant="secondary" size="sm">
                              Editar
                            </Button>
                          </Link>
                          <Button
                            variant="danger"
                            size="sm"
                            loading={removendo === c.id}
                            onClick={() => handleRemover(c.id)}
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
    </AdminShell>
  );
}
