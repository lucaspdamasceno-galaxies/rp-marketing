import { redirect } from "next/navigation";

export default function NovaAprovacaoRedirect() {
  redirect("/admin/aprovacoes");
}
