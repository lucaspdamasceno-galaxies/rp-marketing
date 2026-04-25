"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { setToken, setUsuarioMe } from "@/lib/auth";
import { DEMO_TOKEN, demoUser } from "@/lib/demo";
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

  function entrarNoDemo() {
    setToken(DEMO_TOKEN);
    setUsuarioMe(demoUser);
    router.replace("/dashboard");
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
        ou
        <span className="h-px flex-1 bg-ink-200" />
      </div>

      <button
        type="button"
        onClick={entrarNoDemo}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-ink-200 bg-surface text-sm font-medium text-ink-700 transition hover:bg-ink-100"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-accent-500">
          <path
            d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        Ver demonstração
      </button>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => preencherSeed("cliente")}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-dashed border-ink-200 text-xs font-medium text-ink-500 transition hover:bg-ink-100 hover:text-ink-950"
        >
          Preencher: Cliente
        </button>
        <button
          type="button"
          onClick={() => preencherSeed("admin")}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-dashed border-ink-200 text-xs font-medium text-ink-500 transition hover:bg-ink-100 hover:text-ink-950"
        >
          Preencher: Admin
        </button>
      </div>
    </div>
  );
}
