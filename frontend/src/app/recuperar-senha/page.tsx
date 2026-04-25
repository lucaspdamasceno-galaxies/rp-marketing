"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AuthShell } from "@/components/layout/AuthShell";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/recuperar-senha", { email }, { auth: false });
      setSuccess(true);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Erro ao enviar email de recuperação";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-ink-950">
            Recuperar senha
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Informe seu email e enviaremos um link para redefinir sua senha.
          </p>
        </div>

        {success ? (
          <div className="flex flex-col gap-4">
            <div
              role="status"
              className="rounded-lg border border-success-100 bg-success-100/40 px-3 py-2.5 text-sm text-success-500"
            >
              Se o email existir em nossa base, você receberá as instruções em
              instantes.
            </div>
            <Link
              href="/login"
              className="text-center text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
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

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-danger-100 bg-danger-100/40 px-3 py-2.5 text-sm text-danger-500"
              >
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="mt-2 w-full">
              Enviar link de recuperação
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
    </AuthShell>
  );
}
