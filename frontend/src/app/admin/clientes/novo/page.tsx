"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api";
import type { Cliente } from "@/types/api";

export default function NovoClientePage() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post<Cliente>("/admin/clientes", {
        nome,
        email,
        senha,
        nome_empresa: nomeEmpresa,
      });
      router.replace("/admin/clientes");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Erro ao criar cliente";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell
      title="Novo cliente"
      subtitle="Crie o usuário e a empresa de um novo cliente"
    >
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/admin/clientes"
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
              <Input
                label="Nome do responsável"
                name="nome"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={loading}
              />
              <Input
                label="Nome da empresa"
                name="nome_empresa"
                required
                value={nomeEmpresa}
                onChange={(e) => setNomeEmpresa(e.target.value)}
                disabled={loading}
              />
              <Input
                label="Email"
                type="email"
                name="email"
                autoComplete="off"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <Input
                label="Senha provisória"
                type="password"
                name="senha"
                autoComplete="new-password"
                required
                hint="O cliente poderá alterar depois pelo painel"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-danger-100 bg-danger-100/40 px-3 py-2.5 text-sm text-danger-500"
              >
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-ink-200 pt-5">
              <Link href="/admin/clientes">
                <Button type="button" variant="ghost" disabled={loading}>
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" loading={loading}>
                Criar cliente
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AdminShell>
  );
}
