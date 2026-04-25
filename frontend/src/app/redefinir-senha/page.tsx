"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AuthShell } from "@/components/layout/AuthShell";

export default function RedefinirSenhaPage() {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <RedefinirSenhaForm />
      </Suspense>
    </AuthShell>
  );
}

function RedefinirSenhaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Link inválido ou expirado. Solicite um novo email de recuperação.");
      return;
    }
    if (novaSenha.length < 8) {
      setError("A senha precisa ter no mínimo 8 caracteres.");
      return;
    }
    if (novaSenha !== confirmar) {
      setError("As senhas não conferem.");
      return;
    }
    setLoading(true);
    try {
      await api.post(
        "/auth/redefinir-senha",
        { token, nova_senha: novaSenha },
        { auth: false },
      );
      setSucesso(true);
      setTimeout(() => router.replace("/login"), 1500);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Erro ao redefinir senha";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-ink-950">
          Defina uma nova senha
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          Escolha uma senha segura com no mínimo 8 caracteres.
        </p>
      </div>

      {sucesso ? (
        <div className="flex flex-col gap-4">
          <div
            role="status"
            className="rounded-lg border border-success-100 bg-success-100/40 px-3 py-2.5 text-sm text-success-500"
          >
            Senha redefinida com sucesso. Redirecionando para o login…
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Nova senha"
            type="password"
            name="nova_senha"
            autoComplete="new-password"
            placeholder="••••••••"
            required
            minLength={8}
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            disabled={loading}
          />
          <Input
            label="Confirmar nova senha"
            type="password"
            name="confirmar"
            autoComplete="new-password"
            placeholder="••••••••"
            required
            minLength={8}
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            disabled={loading}
          />

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-danger-100 bg-danger-100/40 px-3 py-2.5 text-sm text-danger-500"
            >
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} className="mt-2 w-full">
            Salvar nova senha
          </Button>

          <Link
            href="/login"
            className="text-center text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            Voltar para o login
          </Link>
        </form>
      )}
    </div>
  );
}
