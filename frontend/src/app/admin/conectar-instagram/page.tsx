"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api";
import { mockClientes } from "@/lib/mock";

export default function ConectarInstagramPage() {
  return (
    <AdminShell
      title="Conectar Instagram"
      subtitle="Vincule a conta Instagram Business de um cliente via OAuth do Meta"
    >
      <Suspense fallback={null}>
        <ConectarInstagramContent />
      </Suspense>
    </AdminShell>
  );
}

function ConectarInstagramContent() {
  const params = useSearchParams();
  const clientePreSelecionado = params.get("cliente");
  const code = params.get("code");

  const [clienteId, setClienteId] = useState(clientePreSelecionado ?? "");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (!code || !clienteId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErro(null);
      try {
        await api.post("/admin/instagram/conectar", {
          cliente_id: clienteId,
          code,
        });
        if (!cancelled) setSucesso(true);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiError ? err.message : "Erro ao conectar Instagram";
        setErro(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, clienteId]);

  function abrirOAuth() {
    if (!clienteId) {
      setErro("Selecione um cliente antes de iniciar a conexão.");
      return;
    }
    const appId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID ?? "";
    const redirect =
      typeof window !== "undefined"
        ? `${window.location.origin}/admin/conectar-instagram?cliente=${clienteId}`
        : "";
    const scope = [
      "instagram_basic",
      "instagram_manage_insights",
      "pages_show_list",
      "pages_read_engagement",
    ].join(",");
    const url =
      `https://www.facebook.com/v19.0/dialog/oauth?` +
      `client_id=${appId}&redirect_uri=${encodeURIComponent(redirect)}&scope=${scope}`;
    if (!appId) {
      setErro(
        "NEXT_PUBLIC_INSTAGRAM_APP_ID não configurado. Defina em .env.local",
      );
      return;
    }
    window.location.href = url;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Card>
        <h2 className="text-lg font-semibold text-ink-950">Como funciona</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-ink-700">
          <li>Selecione o cliente que terá a conta vinculada.</li>
          <li>Clique em &quot;Conectar Instagram&quot; e faça login na conta Meta do cliente.</li>
          <li>Autorize as permissões solicitadas.</li>
          <li>O backend troca o código por um token de longa duração e salva a conexão.</li>
        </ol>
        <p className="mt-4 rounded-lg border border-ink-200 bg-ink-50/60 p-3 text-xs text-ink-500">
          Pré-requisitos: a conta precisa ser <b>Instagram Business</b> ou
          <b> Creator</b> e estar vinculada a uma página do Facebook do cliente.
        </p>
      </Card>

      <Card>
        <div className="flex flex-col gap-1.5">
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
            disabled={loading}
            className="h-11 rounded-lg border border-ink-300 bg-surface px-3.5 text-[15px] text-ink-950 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 disabled:opacity-60"
          >
            <option value="">Selecione um cliente…</option>
            {mockClientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome_empresa}
                {c.instagram_conectado ? " (já conectado)" : ""}
              </option>
            ))}
          </select>
        </div>

        {erro && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-danger-100 bg-danger-100/40 px-3 py-2.5 text-sm text-danger-500"
          >
            {erro}
          </div>
        )}

        {sucesso && (
          <div
            role="status"
            className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-success-100 bg-success-100/40 px-3 py-2.5 text-sm text-success-500"
          >
            <span>Conta conectada com sucesso!</span>
            <Badge tone="success">Conectado</Badge>
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-3">
          <Link href="/admin/clientes">
            <Button variant="ghost" disabled={loading}>
              Cancelar
            </Button>
          </Link>
          <Button
            type="button"
            onClick={abrirOAuth}
            loading={loading}
            disabled={!clienteId || sucesso}
          >
            Conectar Instagram
          </Button>
        </div>
      </Card>
    </div>
  );
}
