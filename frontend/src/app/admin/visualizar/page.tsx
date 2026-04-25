"use client";

import Link from "next/link";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { mockClientes } from "@/lib/mock";

export default function VisualizarComoClientePage() {
  return (
    <AdminShell
      title="Ver como cliente"
      subtitle="Pré-visualize o painel exatamente como cada cliente vê"
    >
      <div className="flex flex-col gap-6">
        <Card>
          <h2 className="text-base font-semibold text-ink-950">
            Como funciona
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Escolha um cliente abaixo para abrir o painel dele em modo
            pré-visualização. Você poderá trocar entre clientes a qualquer
            momento e voltar ao painel admin quando quiser.
          </p>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mockClientes.map((c) => (
            <Link
              key={c.id}
              href={`/admin/visualizar/${c.id}`}
              className="group rounded-2xl border border-ink-200 bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-accent-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-base font-semibold text-brand-700">
                  {iniciais(c.nome_empresa)}
                </div>
                {c.instagram_conectado ? (
                  <Badge tone="success">Conectado</Badge>
                ) : (
                  <Badge tone="warning">Pendente</Badge>
                )}
              </div>
              <div className="mt-4">
                <p className="text-base font-semibold text-ink-950">
                  {c.nome_empresa}
                </p>
                <p className="mt-0.5 text-xs text-ink-500">{c.email}</p>
              </div>
              <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent-600 transition group-hover:text-accent-700">
                Visualizar painel →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const a = partes[0]?.[0] ?? "";
  const b = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return (a + b).toUpperCase();
}
