import type { UsuarioMe } from "@/types/api";

export const DEMO_TOKEN = "demo-token";

export const demoUser: UsuarioMe = {
  id: "demo-user",
  nome: "Lucas Damasceno",
  email: "lucas@studioaurora.com",
  role: "cliente",
  cliente_id: "c1",
};

export function isDemo(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("rp_token") === DEMO_TOKEN;
}
