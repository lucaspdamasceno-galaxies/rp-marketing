"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { clearToken, getToken, getUsuario, setUsuarioMe } from "@/lib/auth";
import type { UsuarioMe } from "@/types/api";

type State = {
  user: UsuarioMe | null;
  loading: boolean;
};

export function useUser(): State {
  const router = useRouter();
  const [state, setState] = useState<State>(() => {
    const cached = getUsuario();
    return { user: cached, loading: !cached };
  });

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setState({ user: null, loading: false });
      router.replace("/login");
      return;
    }
    let cancelled = false;
    api
      .get<UsuarioMe>("/auth/me")
      .then((user) => {
        if (cancelled) return;
        setUsuarioMe(user);
        setState({ user, loading: false });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
          router.replace("/login");
          return;
        }
        setState((prev) => ({ user: prev.user, loading: false }));
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return state;
}
