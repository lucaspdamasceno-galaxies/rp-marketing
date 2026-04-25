"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { setToken, setUsuarioMe } from "@/lib/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AuthShell } from "@/components/layout/AuthShell";
import type { LoginResponse } from "@/types/api";

const SEEDS = {
  cliente: { email: "cliente1@teste.com", senha: "teste1234" },
  admin: { email: "admin@rpmarketing.com.br", senha: "admin12345" },
};

function homePathFor(role: "admin" | "cliente"): string {
  return role === "admin" ? "/admin/clientes" : "/dashboard";
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.post<LoginResponse>(
        "/auth/login",
        { email, senha },
        { auth: false },
      );
      setToken(data.access_token);
      setUsuarioMe({ ...data.usuario, cliente_id: null });
      router.replace(redirectTo ?? homePathFor(data.usuario.role));
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Erro ao fazer login";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function preencherSeed(perfil: "cliente" | "admin") {
    setEmail(SEEDS[perfil].email);
    setSenha(SEEDS[perfil].senha);
    setError(null);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-ink-950">
          Bem-vindo de volta
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          Acesse o painel da sua marca para acompanhar o desempenho.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="seu@email.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        <Input
          label="Senha"
          type="password"
          name="senha"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
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
          Entrar
        </Button>

        <Link
          href="/recuperar-senha"
          className="text-center text-sm font-medium text-brand-700 hover:text-brand-800"
        >
          Esqueci minha senha
        </Link>
      </form>

      <div className="mt-8 flex items-center gap-3 text-xs text-ink-400">
        <span className="h-px flex-1 bg-ink-200" />
        credenciais de teste
        <span className="h-px flex-1 bg-ink-200" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => preencherSeed("cliente")}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-ink-200 bg-surface text-xs font-medium text-ink-700 transition hover:bg-ink-100"
        >
          Como Cliente
        </button>
        <button
          type="button"
          onClick={() => preencherSeed("admin")}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-ink-200 bg-surface text-xs font-medium text-ink-700 transition hover:bg-ink-100"
        >
          Como Admin
        </button>
      </div>
    </div>
  );
}
